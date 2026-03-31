# app/domains/users/router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db.session import get_db
from app.api.dependencies import get_current_user, get_current_user_id
from app.domains.users.model import User
from app.domains.users import service
from app.domains.users.schema import (
    DeviceLinkRequest,
    DeviceLinkResponse,
    UserMeResponse,
    UserNicknameUpdate,
)

router = APIRouter(prefix="/app/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def get_me(user=Depends(get_current_user)):
    """
    현재 유저 정보 조회
    """
    return UserMeResponse(
        id=user.id,
        email=user.email,
        nickname=user.nickname,
        name=user.name,
        birth=user.birth,
        device_id=user.device_id,
    )


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    회원 탈퇴
    """
    await service.delete_user(db, user=user)
    return {"ok": True}


@router.patch("/me")
async def patch_me(
    payload: UserNicknameUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    유저의 닉네임 변경
    """
    await service.update_user_nickname(db, user=user, payload=payload)
    return {"ok": True}


@router.post(
    "/device", response_model=DeviceLinkResponse, status_code=status.HTTP_200_OK
)
async def link_device(
    payload: DeviceLinkRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Serial no으로 기기 연동
    """
    device_id, serial_no = await service.link_device(
        db,
        user_id=user_id,
        serial_no=payload.serial_no,
    )

    return DeviceLinkResponse(device_id=device_id, serial_no=serial_no)
