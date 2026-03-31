from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from app.core.db.session import SessionLocal
from app.domains.telemetry import repository
from app.domains.sse import service as sse_service
from app.domains.telemetry.schema import (
    EventPayload,
    HeartbeatPayload,
    ImageEventPayload,
)
from app.infra.ai_client.http import (
    AIRequestHTTPError,
    AIRequestInvalidResponseError,
    AIRequestNetworkError,
    AIRequestTimeoutError,
    request_chat_text_process,
    request_image_describe,
)
from app.infra.storage.s3 import generate_presigned_url
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EVENT_IMG = "IMG"
EVENT_CONVERSATION = "CONVERSATION"
STATUS_HEARTBEAT = "HEARTBEAT"


async def ingest_message_and_create_job(
    db: AsyncSession,
    *,
    topic_device_id: str,
    source_topic: str,
    raw_payload: dict[str, Any],
    response_topic: str | None = None,
) -> int | None:
    try:
        device = await repository.get_device_by_topic_device_id(db, topic_device_id)
        if not device:
            logger.error("[수집 실패]: 미등록 기기 | device_id=%s", topic_device_id)
            return None

        if "/status/heartbeat" in source_topic:
            heartbeat = HeartbeatPayload(**raw_payload)
            await repository.create_status_log(
                db,
                device_id=device.id,
                payload=raw_payload,
                status_type=STATUS_HEARTBEAT,
                ts=heartbeat.timestamp or _utc_now(),
            )
            await db.commit()
            await sse_service.notify_device_status(
                device_id=device.id,
                payload=raw_payload,
            )
            logger.info(
                "[수집 성공] 상태 로그 저장 완료 | device_id=%s topic=%s",
                device.id,
                source_topic,
            )
            return None

        event_type = _event_type_from_topic(source_topic)
        if event_type is None:
            logger.warning("[수집 스킵] 미지원 토픽 | topic=%s", source_topic)
            return None

        if event_type == EVENT_IMG:
            parsed_payload = ImageEventPayload(**raw_payload)
            ts = parsed_payload.timestamp or _utc_now()
        else:
            parsed_payload = EventPayload(**raw_payload)
            ts = parsed_payload.timestamp or _utc_now()

        event_log = await repository.create_event_log(
            db,
            device_id=device.id,
            payload=raw_payload,
            event_type=event_type,
            ts=ts,
        )

        if event_type == EVENT_IMG:
            await repository.create_ai_img_result_initial(
                db,
                device_id=device.id,
                source_event_log_id=int(event_log.id),
                input_payload=raw_payload,
            )

        job = await repository.create_pending_job(
            db,
            device_id=device.id,
            source_event_logs_id=int(event_log.id),
            request_topic=source_topic,
            response_topic=response_topic,
            input_payload={
                "topic_device_id": topic_device_id,
                "source_topic": source_topic,
                "event_type": event_type,
                "payload": raw_payload,
            },
        )

        await db.commit()
        logger.info(
            "[이벤트 수집 성공] device_id=%s event_log_id=%s job_id=%s topic=%s",
            device.id,
            event_log.id,
            job.id,
            source_topic,
        )
        return int(job.id)

    except Exception as e:
        await db.rollback()
        logger.error("[수집 실패] DB 에러 빌생: %s", e)
        return None


async def process_inference_job(
    job_id: int,
) -> tuple[str, dict[str, Any]] | None:
    async with SessionLocal() as db:
        job = await repository.get_job_by_id(db, job_id)
        if not job:
            logger.error("[DB 조회 실패] 존재하지 않는 job_id=%s", job_id)
            return None

        request_topic = job.request_topic or ""
        event_type = _event_type_from_topic(request_topic)
        if event_type is None:
            await _mark_job_failed(job_id, f"미지원 request_topic: {request_topic}")
            return None

        # ai_request_payload = {
        #     "job_id": int(job.id),
        #     "device_id": int(job.device_id),
        #     "request_topic": job.request_topic,
        #     "input_payload": job.input_payload,
        #     "source_event_logs_id": job.source_event_logs_id,
        # }
        if event_type == EVENT_CONVERSATION:
            ai_request_payload = await _build_conversation_request_payload(db, job)
        elif event_type == EVENT_IMG:
            try:
                img_payload = _build_image_request_payload_v2(job)
            except ValueError as e:
                await _record_img_error(job.source_event_logs_id, str(e), "validate")
                await _mark_job_failed(job_id, f"IMG payload validation failed: {e}")
                return None

            try:
                presigned_url = await generate_presigned_url(
                    bucket=img_payload["bucket"],
                    key=img_payload["image_key"],
                )
            except Exception as e:
                await _record_img_error(job.source_event_logs_id, str(e), "presign")
                await _mark_job_failed(job_id, f"Presigned URL generation failed: {e}")
                return None

            ai_request_payload = {
                "device_id": img_payload["device_id"],
                "s3_url": presigned_url,
            }
        else:
            await _mark_job_failed(job_id, f"지원하지 않는 event_type: {event_type}")
            return None

    try:
        # 토픽별 고정 경로로 호출
        if event_type == EVENT_CONVERSATION:
            ai_response = await request_chat_text_process(ai_request_payload)
        elif event_type == EVENT_IMG:
            ai_response = await request_image_describe(ai_request_payload)
        else:
            await _mark_job_failed(job_id, f"지원하지 않는 event_type: {event_type}")
            return None

    except (
        AIRequestTimeoutError,
        AIRequestNetworkError,
        AIRequestHTTPError,
        AIRequestInvalidResponseError,
        ValueError,
    ) as e:
        if event_type == EVENT_IMG:
            await _record_img_error(job.source_event_logs_id, str(e), "ai_request")
        await _mark_job_failed(job_id, f"AI 서버 요청 실패: {e}")
        return None
    except Exception as e:
        if event_type == EVENT_IMG:
            await _record_img_error(job.source_event_logs_id, str(e), "ai_request")
        await _mark_job_failed(job_id, f"AI 처리 중 에러 발생: {e}")
        return None

    async with SessionLocal() as db:
        try:
            updated = await repository.mark_job_done(
                db,
                job_id=job_id,
                ai_response=ai_response,
            )
            if not updated:
                await db.rollback()
                logger.error(
                    "[job 업데이트 실패] DONE 반영 대상 job이 없음 | job_id=%s",
                    job_id,
                )
                return None

            # img 이벤트면 결과 테이블에도 저장
            if event_type == EVENT_IMG and updated.source_event_logs_id is not None:
                await repository.update_ai_img_result_response(
                    db,
                    source_event_log_id=int(updated.source_event_logs_id),
                    ai_response=ai_response,
                )

            await db.commit()

            if event_type == EVENT_IMG:
                return None

            if not updated.response_topic:
                logger.warning(
                    "[MQTT PUB 스킵] response_topic이 비어 있어 MQTT 결과 발행 불가능 | job_id=%s",
                    job_id,
                )
                return None

            publish_payload = {
                "job_id": int(updated.id),
                "status": repository.JOB_DONE,
                "result": ai_response,
            }
            return updated.response_topic, publish_payload

        except Exception as e:
            await db.rollback()
            logger.error("[job 업데이트 실패] DONE 반영 중 에러 발생: %s", e)
            return None


async def _mark_job_failed(job_id: int, reason: str) -> None:
    async with SessionLocal() as db:
        try:
            updated = await repository.mark_job_failed(
                db,
                job_id=job_id,
                error_message=reason,
            )
            if not updated:
                await db.rollback()
                logger.error(
                    "[상태 반영 실패] FAILED 반영 대상 없음 | job_id=%s",
                    job_id,
                )
                return
            await db.commit()
            logger.error("[AI 처리 실패]: job_id=%s reason=%s", job_id, reason)
        except Exception as e:
            await db.rollback()
            logger.error(
                "[상태 반영 실패] FAILED 반영 중 에러 발생 | job_id=%s error=%s",
                job_id,
                e,
            )


def _event_type_from_topic(topic: str) -> str | None:
    if "/event/img" in topic:
        return EVENT_IMG
    if "/event/conversation" in topic:
        return EVENT_CONVERSATION
    return None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def _build_conversation_request_payload(
    db: AsyncSession,
    job,
) -> dict[str, Any]:
    raw = job.input_payload or {}
    payload = raw.get("payload", {})
    data = payload.get("data", {})

    device_id = raw.get("topic_device_id") or payload.get("device_id")
    user_text = data.get("text")

    if not device_id:
        raise ValueError("conversation payload에 device_id가 없습니다.")
    if not user_text:
        raise ValueError("conversation payload에 user_text(data.text)가 없습니다.")

    recent_jobs = await repository.get_recent_done_conversation_jobs(
        db,
        device_id=int(job.device_id),
        limit=5,
    )

    history: list[dict[str, str]] = []
    for old in reversed(recent_jobs):  # 오래된 -> 최신 순으로 전달
        u_text = _extract_user_text(old.input_payload)
        a_text = _extract_ai_text(old.ai_response)
        if u_text and a_text:
            history.append({"user": u_text, "ai": a_text})

    return {
        "device_id": str(device_id),
        "user_text": str(user_text),
        "history": history,
    }


def _build_image_request_payload(job) -> dict[str, Any]:
    raw = job.input_payload or {}
    payload = raw.get("payload", {})
    event_data = payload.get("event_data", {})

    device_id = raw.get("topic_device_id") or payload.get("device_id")
    s3_url = (
        event_data.get("s3_url")
        or event_data.get("image_url")
        or event_data.get("image_key")
        or payload.get("s3_url")
    )

    if not device_id:
        raise ValueError("img payload에 device_id가 없습니다.")
    if not s3_url:
        raise ValueError(
            "img payload에 s3_url(event_data.image_key/s3_url)이 없습니다."
        )

    return {
        "device_id": str(device_id),
        "s3_url": str(s3_url),
    }


def _build_image_request_payload_v2(job) -> dict[str, Any]:
    raw = job.input_payload or {}
    payload = raw.get("payload", {})

    bucket = payload.get("bucket") or os.getenv("S3_BUCKET")
    image_key = payload.get("image_key") or payload.get("event_data", {}).get(
        "image_key"
    )
    device_id = raw.get("topic_device_id") or payload.get("device_id")

    if not bucket:
        raise ValueError("img payload에 bucket이 없습니다.")
    if not image_key:
        raise ValueError("img payload에 image_key가 없습니다.")
    if not device_id:
        raise ValueError("img payload에 device_id가 없습니다.")

    return {
        "bucket": str(bucket),
        "image_key": str(image_key),
        "device_id": str(device_id),
    }


def _extract_user_text(input_payload: dict[str, Any] | None) -> str | None:
    if not input_payload:
        return None
    return input_payload.get("payload", {}).get("data", {}).get("text")


def _extract_ai_text(ai_response: dict[str, Any] | None) -> str | None:
    if not ai_response:
        return None
    # AI 응답 스키마 차이를 고려해 후보 키 순차 탐색
    for key in ("ai_text", "ai", "answer", "text", "response"):
        value = ai_response.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    # 중첩 구조 대응
    result = ai_response.get("result")
    if isinstance(result, dict):
        for key in ("ai_text", "ai", "answer", "text", "response"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


async def _record_img_error(
    source_event_log_id: int | None, error: str, stage: str
) -> None:
    if source_event_log_id is None:
        return
    async with SessionLocal() as db:
        try:
            await repository.update_ai_img_result_response(
                db,
                source_event_log_id=int(source_event_log_id),
                ai_response={"error": error, "stage": stage},
            )
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error(
                "[ai_img_result error 기록 실패] source_event_log_id=%s err=%s orig=%s",
                source_event_log_id,
                exc,
                error,
            )
