from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .model import Device
from .schema import DeviceUpdate


async def create_device(
    db: AsyncSession, *, serial_no: str, model_name: str, firmware_version: str
) -> Device:
    device = Device(
        serial_no=serial_no,
        model_name=model_name,
        firmware_version=firmware_version,
    )
    db.add(device)
    await db.flush()
    return device


async def get_device(db: AsyncSession, device_id: int) -> Device | None:
    res = await db.execute(select(Device).where(Device.id == device_id))
    return res.scalar_one_or_none()


async def get_device_by_serial(
    db: AsyncSession, serial_no: str
) -> Device | None:
    res = await db.execute(select(Device).where(Device.serial_no == serial_no))
    return res.scalar_one_or_none()


async def update_device(
    db: AsyncSession, device_id: int, payload: DeviceUpdate
) -> Device | None:
    # 1. 기기 조회
    res = await db.execute(select(Device).where(Device.id == device_id))
    device = res.scalar_one_or_none()
    if device is None:
        return None

    # 2. 변경사항 반영
    if payload.model_name is not None:
        device.model_name = payload.model_name
    if payload.firmware_version is not None:
        device.firmware_version = payload.firmware_version

    # 3. DB 반영 후 반환
    await db.flush()
    return device


async def delete_device(db: AsyncSession, device_id: int) -> bool:
    # 1. 기기 조회
    res = await db.execute(select(Device).where(Device.id == device_id))
    device = res.scalar_one_or_none()
    if device is None:
        return False

    # 2. DB 반영
    await db.delete(device)
    await db.flush()
    return True
