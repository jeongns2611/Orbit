# app/domains/reports/router.py
from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db.session import get_db
from app.api.dependencies import get_current_user
from app.core.exceptions import AuthenticationError
from app.domains.users.model import User
from . import schema, service

router = APIRouter(prefix="/app/reports", tags=["reports"])


@router.post("", response_model=schema.ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: schema.ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    데일리 리포트 생성 요청
    """
    if current_user.device_id is None:
        raise AuthenticationError("Not authorized for this device.")
    return await service.upsert_report(
        db,
        user_id=current_user.id,
        device_id=current_user.device_id,
        payload=payload,
    )


@router.get("", response_model=schema.ReportRead)
async def get_report(
    date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    데일리 리포트 일자별 조회
    """
    if current_user.device_id is None:
        raise AuthenticationError("Not authorized for this device.")
    return await service.get_report(db, current_user.device_id, date)


@router.get("/latest-image", response_model=schema.LatestImageRead)
async def get_latest_image(
    date: date | None = None,
    current_user: User = Depends(get_current_user),
):
    """
    최신 이미지 presigned URL 조회
    """
    if current_user.device_id is None:
        raise AuthenticationError("Not authorized for this device.")
    return await service.get_latest_image(
        device_id=current_user.device_id,
        target_date=date,
    )
