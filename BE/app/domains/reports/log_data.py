from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.telemetry.model import AiImgResult, AiInferenceJob
from app.domains.telemetry.repository import JOB_DONE

KST = timezone(timedelta(hours=9))

async def build_chat_history(
    db: AsyncSession, *, device_id: int, target_date: date
) -> list[dict[str, Any]]:
    start = datetime(
        target_date.year,
        target_date.month,
        target_date.day,
        tzinfo=KST,
    )
    end = start + timedelta(days=1)

    chat_history: list[dict[str, Any]] = []
    chat_stmt = (
        select(AiInferenceJob)
        .where(
            AiInferenceJob.device_id == device_id,
            AiInferenceJob.status == JOB_DONE,
        )
        .order_by(AiInferenceJob.completed_at.asc(), AiInferenceJob.id.asc())
    )
    chat_result = await db.execute(chat_stmt)
    chat_rows = list(chat_result.scalars().all())

    for row in chat_rows:
        ai_response = row.ai_response or {}
        if not isinstance(ai_response, dict):
            continue
        user_text = ai_response.get("user_text")
        ai_text = ai_response.get("ai_text")
        received_at = ai_response.get("received_at")
        if not user_text or not ai_text or not received_at:
            continue
        try:
            received_dt = datetime.fromisoformat(received_at)
        except ValueError:
            continue
        if not (start <= received_dt < end):
            continue
        chat_history.append(
            {
                "user": user_text,
                "ai": ai_text,
                "date": received_at,
            }
        )
    return chat_history


async def build_image_caption(
    db: AsyncSession, *, device_id: int, target_date: date
) -> list[dict[str, Any]]:
    start = datetime(
        target_date.year,
        target_date.month,
        target_date.day,
        tzinfo=KST,
    )
    end = start + timedelta(days=1)

    # TODO: fetch image rows (list[dict]) for this device/date
    image_stmt = (
        select(AiImgResult)
        .where(
            AiImgResult.device_id == device_id,
            AiImgResult.created_at >= start,
            AiImgResult.created_at < end,
        )
        .order_by(AiImgResult.created_at.asc(), AiImgResult.id.asc())
    )
    image_result = await db.execute(image_stmt)
    image_rows = list(image_result.scalars().all())

    image_caption: list[dict[str, Any]] = []
    for row in image_rows:
        ai_response = row.ai_response or {}
        if not isinstance(ai_response, dict):
            continue
        full_text = ai_response.get("full_result_text")
        date_value = ai_response.get("started_at")
        if not full_text or not date_value:
            continue
        image_caption.append(
            {
                "full_text": full_text,
                "date": date_value,
            }
        )
    return image_caption
