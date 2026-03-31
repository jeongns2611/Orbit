import asyncio
import os
from typing import Optional

import boto3

MAX_PRESIGNED_EXPIRES_SECONDS = 900  # 15분


def _get_s3_client():
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    if region:
        return boto3.client("s3", region_name=region)
    return boto3.client("s3")


def _resolve_expires() -> int:
    raw = os.getenv("S3_PRESIGN_EXPIRES_SECONDS")
    if not raw:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    try:
        value = int(raw)
    except ValueError:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    if value <= 0:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    if value > MAX_PRESIGNED_EXPIRES_SECONDS:
        return MAX_PRESIGNED_EXPIRES_SECONDS
    return value


def _generate_presigned_url_sync(
    *, bucket: str, key: str, expires: int
) -> str:
    client = _get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


async def generate_presigned_url(
    *, bucket: str, key: str, expires: Optional[int] = None
) -> str:
    exp = expires if expires is not None else _resolve_expires()
    return await asyncio.to_thread(
        _generate_presigned_url_sync,
        bucket=bucket,
        key=key,
        expires=exp,
    )
