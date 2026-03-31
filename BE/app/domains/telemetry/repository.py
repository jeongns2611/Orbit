from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.domains.devices.model import Device
from app.domains.telemetry.model import (
    AiImgResult,
    AiInferenceJob,
    DeviceEventLog,
    DeviceStatusLog,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

JOB_PENDING = "PENDING"
JOB_DONE = "DONE"
JOB_FAILED = "FAILED"


async def get_device_by_serial(
    db: AsyncSession, serial_no: str
) -> Device | None:
    stmt = select(Device).where(Device.serial_no == serial_no)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_device_by_topic_device_id(
    db: AsyncSession, topic_device_id: str
) -> Device | None:
    # Topic device_id is treated as devices.serial_no.
    stmt = select(Device).where(Device.serial_no == topic_device_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_status_log(
    db: AsyncSession,
    *,
    device_id: int,
    payload: dict[str, Any],
    status_type: str,
    ts: datetime,
) -> DeviceStatusLog:
    log = DeviceStatusLog(
        device_id=device_id,
        payload=payload,
        status_type=status_type,
        ts=ts,
    )
    db.add(log)
    await db.flush()
    return log


async def create_event_log(
    db: AsyncSession,
    *,
    device_id: int,
    payload: dict[str, Any],
    event_type: str,
    ts: datetime,
) -> DeviceEventLog:
    log = DeviceEventLog(
        device_id=device_id,
        payload=payload,
        event_type=event_type,
        ts=ts,
    )
    db.add(log)
    await db.flush()
    return log


async def create_pending_job(
    db: AsyncSession,
    *,
    device_id: int,
    input_payload: dict[str, Any],
    request_topic: str | None = None,
    response_topic: str | None = None,
    source_event_logs_id: int | None = None,
) -> AiInferenceJob:
    job = AiInferenceJob(
        device_id=device_id,
        source_event_logs_id=source_event_logs_id,
        request_topic=request_topic,
        response_topic=response_topic,
        input_payload=input_payload,
        status=JOB_PENDING,
    )
    db.add(job)
    await db.flush()
    return job


async def create_ai_img_result(
    db: AsyncSession,
    *,
    device_id: int,
    source_event_log_id: int,
    input_payload: dict[str, Any],
    ai_response: dict[str, Any],
) -> AiImgResult:
    result = AiImgResult(
        device_id=device_id,
        source_event_log_id=source_event_log_id,
        input_payload=input_payload,
        ai_response=ai_response,
    )
    db.add(result)
    await db.flush()
    return result


async def create_ai_img_result_initial(
    db: AsyncSession,
    *,
    device_id: int,
    source_event_log_id: int,
    input_payload: dict[str, Any],
) -> AiImgResult:
    result = AiImgResult(
        device_id=device_id,
        source_event_log_id=source_event_log_id,
        input_payload=input_payload,
        ai_response=None,
    )
    db.add(result)
    await db.flush()
    return result


async def update_ai_img_result_response(
    db: AsyncSession,
    *,
    source_event_log_id: int,
    ai_response: dict[str, Any],
) -> AiImgResult | None:
    stmt = select(AiImgResult).where(
        AiImgResult.source_event_log_id == source_event_log_id
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if not row:
        return None
    row.ai_response = ai_response
    await db.flush()
    return row


async def get_job_by_id(
    db: AsyncSession, job_id: int
) -> AiInferenceJob | None:
    return await db.get(AiInferenceJob, job_id)


async def get_recent_done_conversation_jobs(
    db: AsyncSession,
    *,
    device_id: int,
    limit: int = 5,
) -> list[AiInferenceJob]:
    stmt = (
        select(AiInferenceJob)
        .where(
            AiInferenceJob.device_id == device_id,
            AiInferenceJob.status == JOB_DONE,
            AiInferenceJob.request_topic.like("%/event/conversation"),
        )
        .order_by(AiInferenceJob.completed_at.desc(), AiInferenceJob.id.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def mark_job_done(
    db: AsyncSession,
    *,
    job_id: int,
    ai_response: dict[str, Any],
) -> AiInferenceJob | None:
    job = await db.get(AiInferenceJob, job_id)
    if job is None:
        return None

    job.ai_response = ai_response
    job.status = JOB_DONE
    job.error_message = None
    job.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return job


async def mark_job_failed(
    db: AsyncSession,
    *,
    job_id: int,
    error_message: str,
) -> AiInferenceJob | None:
    job = await db.get(AiInferenceJob, job_id)
    if job is None:
        return None

    job.status = JOB_FAILED
    job.error_message = error_message
    job.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return job
