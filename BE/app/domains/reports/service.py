import os
import asyncio
import re
from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

import boto3

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from .model import Report
from . import repository, schema
from . import log_data

KST = timezone(timedelta(hours=9))
AI_DAILY_REPORT_PATH = "/api/v1/ai/reports/daily"
MAX_PRESIGNED_EXPIRES_SECONDS = 7 * 24 * 60 * 60


# Report 조회
async def get_report(db: AsyncSession, device_id: int, target_date: date | None):
    report = await repository.get_latest_report(
        db, device_id=device_id, target_date=target_date
    )
    if not report:
        raise NotFoundError("Report not found.")
    return report


async def upsert_report(
    db: AsyncSession, *, user_id: int, device_id: int, payload: schema.ReportCreate
):
    # 생성 원하는 일자 설정 (API 요청시 포함)
    target_date = payload.date

    # 기존 리포트 있는지 확인
    existing = await repository.get_latest_report(
        db, device_id=device_id, target_date=target_date
    )

    # AI 서버 주소 확인 (현재 ENV로 하나, 추후 API로 설정)
    base_url = os.getenv("AI_BASE_URL")
    if not base_url:
        raise AppError("AI_BASE_URL is not configured")
    url = f"{base_url.rstrip('/')}{AI_DAILY_REPORT_PATH}"
    ai_payload = {
        "user_id": str(user_id),
        "date": target_date.isoformat(),
        "log_data": {
            "chat_history": await log_data.build_chat_history(
                db, device_id=device_id, target_date=target_date
            ),
            "image_caption": await log_data.build_image_caption(
                db, device_id=device_id, target_date=target_date
            ),
        },
    }
    # AI 서버 요청 및 상태 확인
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=ai_payload)
    except httpx.RequestError as exc:
        raise AppError(f"AI server request failed: {exc}") from exc

    if response.status_code >= 400:
        raise AppError(f"AI server error: status={response.status_code}")

    try:
        data = response.json()
    except ValueError as exc:
        raise AppError("AI server returned invalid JSON") from exc

    # AI 서버로부터 응답받은 데이터 저장
    report_text = data.get("report_text")

    # 값 비면 저장 X
    if not isinstance(report_text, str) or not report_text.strip():
        raise AppError("AI server returned empty report text")
    report_text = report_text.strip()
    # 타임스탬프 설정 (오늘 아니면 타깃 일자로 설정)
    today = datetime.now(tz=KST).date()
    ts = (
        datetime.now(tz=KST)
        if target_date == today
        else datetime.combine(target_date, time(0, 0), tzinfo=KST)
    )

    # 이미 리포트 존재하면 업데이트
    if existing:
        existing.ts = ts
        existing.report_text = report_text
        await db.flush()
        return existing

    # 리포트 없으면 새로 생성
    report = Report(device_id=device_id, ts=ts, report_text=report_text)
    db.add(report)
    await db.flush()
    return report


def _get_s3_client():
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    if region:
        return boto3.client("s3", region_name=region)
    return boto3.client("s3")


def _resolve_prefix(device_id: int, target_date: date | None) -> str | None:
    prefix = os.getenv("S3_IMAGE_PREFIX")
    if not prefix:
        return None
    return prefix.format(
        device_id=device_id,
        date=target_date.isoformat() if target_date else "",
    )


def _get_presign_expires() -> int:
    raw = os.getenv(
        "S3_PRESIGN_EXPIRES_SECONDS",
        str(MAX_PRESIGNED_EXPIRES_SECONDS),
    )
    try:
        expires = int(raw)
    except ValueError:
        expires = MAX_PRESIGNED_EXPIRES_SECONDS
    if expires <= 0:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    if expires > MAX_PRESIGNED_EXPIRES_SECONDS:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    return expires


def _parse_timestamp_from_key(key: str) -> datetime | None:
    raw = key.strip()

    if raw.isdigit():
        value = int(raw)
        if value >= 10**12:
            return datetime.fromtimestamp(value / 1000, tz=KST)
        if value >= 10**9:
            return datetime.fromtimestamp(value, tz=KST)

    try:
        iso = raw.replace("Z", "+00:00")
        ts = datetime.fromisoformat(iso)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=KST)
        return ts
    except ValueError:
        pass

    # key에 timestamp 패턴이 들어간 경우 (예: child_20260204_151144.jpg)
    m = re.search(r"(\d{8})_(\d{6})", raw)
    if not m:
        return None

    date_part, time_part = m.group(1), m.group(2)
    try:
        dt = datetime.strptime(f"{date_part}{time_part}", "%Y%m%d%H%M%S")
        return dt.replace(tzinfo=KST)
    except ValueError:
        return None


def _find_latest_object_key(
    s3_client,
    *,
    bucket: str,
    prefix: str | None,
    target_date: date | None,
) -> tuple[str, datetime] | None:
    best_key: str | None = None
    best_ts: datetime | None = None
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix or ""):
        for obj in page.get("Contents", []):
            key = obj.get("Key")
            if not key:
                continue
            ts = _parse_timestamp_from_key(key)
            if not ts:
                continue
            if target_date:
                if ts.date() != target_date:
                    continue
            if best_ts is None or ts > best_ts:
                best_key = key
                best_ts = ts
    if not best_key or not best_ts:
        return None
    return best_key, best_ts


def _generate_presigned_url(
    s3_client,
    *,
    bucket: str,
    key: str,
    expires: int,
) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


async def get_latest_image(
    *,
    device_id: int,
    target_date: date | None,
) -> schema.LatestImageRead:
    bucket = os.getenv("S3_BUCKET")
    if not bucket:
        raise AppError("S3_BUCKET is not configured")

    expires = _get_presign_expires()
    s3_client = _get_s3_client()
    prefix = _resolve_prefix(device_id, target_date)
    latest = await asyncio.to_thread(
        _find_latest_object_key,
        s3_client,
        bucket=bucket,
        prefix=prefix,
        target_date=target_date,
    )
    if not latest:
        raise NotFoundError("Image not found.")

    key, ts = latest
    url = await asyncio.to_thread(
        _generate_presigned_url,
        s3_client,
        bucket=bucket,
        key=key,
        expires=expires,
    )

    print(f"url={url}, key={key}, timestamp={ts.astimezone(KST).isoformat()}")

    return schema.LatestImageRead(
        url=url,
        key=key,
        timestamp=ts.astimezone(KST).isoformat(),
    )
