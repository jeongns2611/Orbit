from app.core.exceptions import ConflictError, NotFoundError
from sqlalchemy.ext.asyncio import AsyncSession

from . import repository, schema


async def create_device(db: AsyncSession, payload: schema.DeviceCreate):
    # 중복 체크
    existing = await repository.get_device_by_serial(
        db, serial_no=payload.serial_no
    )
    if existing:
        raise ConflictError("이미 등록된 기기입니다.")

    return await repository.create_device(db, **payload.dict())


async def get_device(db: AsyncSession, device_id: int):
    device = await repository.get_device(db, device_id)
    if not device:
        raise NotFoundError("해당 기기를 찾을 수 없습니다.")

    return device


async def update_device(
    db: AsyncSession, device_id: int, payload: schema.DeviceUpdate
):
    device = await repository.get_device(db, device_id)

    if not device:
        raise NotFoundError("해당 기기를 찾을 수 없습니다.")

    return await repository.update_device(db, device_id, payload)


async def delete_device(db: AsyncSession, device_id: int):
    device = await repository.get_device(db, device_id)
    if not device:
        raise NotFoundError("해당 기기를 찾을 수 없습니다.")

    ok = await repository.delete_device(db, device_id)
    if not ok:
        raise NotFoundError("해당 기기를 찾을 수 없습니다.")
