from __future__ import annotations

import asyncio
import contextlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncGenerator

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db.session import SessionLocal

# 모델 경로 달라질 예정 > 실제 AI 분석 결과 저장되는 모델로 변경 필요
from app.domains.telemetry.model import AiImgResult, DeviceStatusLog

# 실제 데이터 들어오면 지울 코드 GGUGGU
from app.domains.sse.schema import MockImageCreateRequest

# SSE 이벤트 종류
SSE_EVENT_TIMELINE_IMAGE = "IMAGE"
SSE_EVENT_DEVICE_STATUS = "DEVICE_STATUS"
VALID_DRIVE_STATES = {"TRACKING", "HOLD_DECAY", "STOP"}

# SSE 설정
SSE_HEARTBEAT_SECONDS = 15
SSE_QUEUE_MAXSIZE = 1000
SSE_IMAGE_MINUTE = 1
SSE_DEVICE_SECOND = 2

# 연결된 클라이언트 관리 (device_id 기준)
connection_registry: dict[int, set[asyncio.Queue[dict[str, Any]]]] = {}
timeline_last_sent: dict[int, int] = {}
timeline_task_registry: dict[int, asyncio.Task[None]] = {}
device_status_last_sent: dict[int, int] = {}
device_status_task_registry: dict[int, asyncio.Task[None]] = {}
connection_registry_lock = asyncio.Lock()  # 데이터 일관성을 위해 락 사용


async def register_connection(device_id: int) -> asyncio.Queue[dict[str, Any]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=SSE_QUEUE_MAXSIZE)
    async with connection_registry_lock:
        queues = connection_registry.setdefault(device_id, set())
        queues.add(queue)
    return queue


async def unregister_connection(
    device_id: int,
    queue: asyncio.Queue[dict[str, Any]],
) -> None:
    async with connection_registry_lock:
        queues = connection_registry.get(device_id)
        if not queues:
            return
        queues.discard(queue)
        if not queues:
            connection_registry.pop(device_id, None)


async def notify_device(
    device_id: int,
    *,
    event: str,
    data: dict[str, Any],
) -> int:
    async with connection_registry_lock:
        queues = list(connection_registry.get(device_id, set()))

    for queue in queues:
        # No coalescing: 모든 메시지와 순서를 보장
        await queue.put({"event": event, "data": data})

    return len(queues)


async def sse_event_generator(
    request: Request,
    *,
    device_id: int,
    queue: asyncio.Queue[dict[str, Any]],
) -> AsyncGenerator[str, None]:
    await _ensure_timeline_task(device_id)
    # NOTE: device status SSE is now broadcast on device_status_logs creation.
    # Keeping the periodic notifier disabled for now.
    # await _ensure_device_status_task(device_id)
    try:
        while True:
            if await request.is_disconnected():
                break

            try:
                message = await asyncio.wait_for(
                    queue.get(),
                    timeout=SSE_HEARTBEAT_SECONDS,
                )
                event = str(message.get("event", "message"))
                data = message.get("data", {})
                yield encode_sse(event=event, data=data)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        await unregister_connection(device_id, queue)
        await _stop_timeline_task_if_unused(device_id)
        await _stop_device_status_task_if_unused(device_id)


def encode_sse(*, event: str, data: dict[str, Any]) -> str:
    encoded = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    return f"event: {event}\ndata: {encoded}\n\n"


async def _periodic_timeline_sender(device_id: int) -> None:
    while True:
        async with SessionLocal() as db:
            try:
                await notify_latest_timeline_image(db, device_id=device_id)
            except Exception:
                pass
        await asyncio.sleep(SSE_IMAGE_MINUTE * 60)


async def _periodic_device_status_sender(device_id: int) -> None:
    while True:
        async with SessionLocal() as db:
            try:
                # NOTE: device status SSE is now broadcast on device_status_logs creation.
                # await notify_latest_device_status(db, device_id=device_id)
                pass
            except Exception:
                pass
        await asyncio.sleep(SSE_DEVICE_SECOND)


async def _ensure_timeline_task(device_id: int) -> None:
    async with connection_registry_lock:
        if device_id in timeline_task_registry:
            return
        timeline_task_registry[device_id] = asyncio.create_task(
            _periodic_timeline_sender(device_id)
        )


async def _ensure_device_status_task(device_id: int) -> None:
    async with connection_registry_lock:
        if device_id in device_status_task_registry:
            return
        device_status_task_registry[device_id] = asyncio.create_task(
            _periodic_device_status_sender(device_id)
        )


async def _stop_timeline_task_if_unused(device_id: int) -> None:
    task: asyncio.Task[None] | None = None
    async with connection_registry_lock:
        if connection_registry.get(device_id):
            return
        task = timeline_task_registry.pop(device_id, None)
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


async def _stop_device_status_task_if_unused(device_id: int) -> None:
    task: asyncio.Task[None] | None = None
    async with connection_registry_lock:
        if connection_registry.get(device_id):
            return
        task = device_status_task_registry.pop(device_id, None)
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


def build_device_status_payload(
    payload: dict[str, Any],
    *,
    invalid_as_stop: bool = False,
) -> dict[str, Any] | None:
    raw_value = payload.get("drive_state")
    if not isinstance(raw_value, str):
        return None

    normalized = raw_value.strip().upper()
    if normalized not in VALID_DRIVE_STATES:
        if not invalid_as_stop:
            return None
        normalized = "STOP"

    return {"drive_state": normalized}


async def notify_device_status(
    *,
    device_id: int,
    payload: dict[str, Any],
    invalid_as_stop: bool = False,
) -> bool:
    data = build_device_status_payload(
        payload,
        invalid_as_stop=invalid_as_stop,
    )
    if not data:
        return False

    await notify_device(
        device_id,
        event=SSE_EVENT_DEVICE_STATUS,
        data=data,
    )
    return True


# 실제 데이터 들어오면 지울 코드 GGUGGU
async def create_mock_image_result(
    db: AsyncSession,
    *,
    device_id: int,
    payload: MockImageCreateRequest,
) -> AiImgResult:
    started_at = payload.started_at or datetime.now(timezone.utc).isoformat()
    ai_response = {
        "short_result_text": payload.short_result_text,
        "started_at": started_at,
        "mock": True,
    }
    row = AiImgResult(
        device_id=device_id,
        source_event_log_id=payload.source_event_log_id,
        input_payload=payload.input_payload or {"mock": True},
        ai_response=ai_response,
    )
    db.add(row)
    await db.flush()
    return row


# 이미지 AI 분석 결과 저장되면 실행
async def notify_timeline_image(
    *,
    device_id: int,
    result: AiImgResult,
) -> bool:
    ai_response = result.ai_response or {}

    short_text = ai_response.get("short_result_text")
    started_at = ai_response.get("started_at")

    if not (
        isinstance(short_text, str)
        and (short_text := short_text.strip())
        and isinstance(started_at, str)
    ):
        return False

    normalized_started_at = started_at.replace("Z", "+00:00")
    try:
        datetime.fromisoformat(normalized_started_at)
    except ValueError:
        return False

    data = {
        "id": int(result.id),
        "created_at": started_at,
        "short_result_text": short_text,
    }

    await notify_device(
        device_id,
        event=SSE_EVENT_TIMELINE_IMAGE,
        data=data,
    )
    return True


async def notify_latest_timeline_image(
    db: AsyncSession,
    *,
    device_id: int,
) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=SSE_IMAGE_MINUTE)
    stmt = (
        select(AiImgResult)
        .where(
            AiImgResult.device_id == device_id,
            AiImgResult.created_at >= cutoff,
        )
        .order_by(AiImgResult.created_at.desc(), AiImgResult.id.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if not row:
        return False

    last_sent_id = timeline_last_sent.get(device_id)
    if last_sent_id is not None and int(row.id) <= last_sent_id:
        return False

    notified = await notify_timeline_image(
        device_id=device_id,
        result=row,
    )
    if notified:
        timeline_last_sent[device_id] = int(row.id)
    return notified


async def notify_latest_device_status(
    db: AsyncSession,
    *,
    device_id: int,
) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=SSE_DEVICE_SECOND)
    stmt = (
        select(DeviceStatusLog)
        .where(
            DeviceStatusLog.device_id == device_id,
            DeviceStatusLog.ts >= cutoff,
        )
        .order_by(DeviceStatusLog.ts.desc(), DeviceStatusLog.id.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if not row:
        return False

    last_sent_id = device_status_last_sent.get(device_id)
    if last_sent_id is not None and int(row.id) <= last_sent_id:
        return False

    if not isinstance(row.payload, dict):
        return False

    notified = await notify_device_status(
        device_id=device_id,
        payload=row.payload,
    )
    if notified:
        device_status_last_sent[device_id] = int(row.id)
    return notified
