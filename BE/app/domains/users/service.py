# app/domains/users/service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.domains.devices.model import Device
from app.domains.users.model import User
from app.domains.users.schema import UserNicknameUpdate


async def delete_user(db: AsyncSession, *, user: User) -> None:
    if user is None:
        raise NotFoundError("User not found")
    await db.delete(user)


async def link_device(
    db: AsyncSession,
    *,
    user_id: int,
    serial_no: str,
) -> tuple[int, str]:
    """
    로그인 유저(user_id)가 기기(serial_no)를 연동한다.
    - devices.serial_no가 없으면 DeviceNotFound
    - 중복 연동 허용 (다른 유저가 이미 같은 device를 연동해도 허용)
    """
    sn = (serial_no or "").strip()
    if not sn:
        raise ValidationError("INVALID_SERIAL")

    # device 조회
    result = await db.execute(select(Device).where(Device.serial_no == sn))
    device = result.scalar_one_or_none()
    if device is None:
        raise NotFoundError("DEVICE_NOT_FOUND")

    # user 조회
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found")

    # 3) 연동
    user.device_id = device.id

    # await db.commit()
    return device.id, device.serial_no


async def update_user_nickname(
    db: AsyncSession,
    *,
    user: User,
    payload: UserNicknameUpdate,
) -> None:
    if user is None:
        raise NotFoundError("User not found")

    nickname = (payload.nickname or "").strip()
    if not nickname:
        raise ValidationError("Nickname is required")
    if len(nickname) > 50:
        raise ValidationError("Nickname must be 50 characters or fewer")

    user.nickname = nickname
    await db.flush()
