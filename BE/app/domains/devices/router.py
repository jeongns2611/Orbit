from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db.session import get_db
from . import service, schema

router = APIRouter(prefix="/app/devices", tags=["devices"])

@router.post("", response_model=schema.DeviceRead, status_code=status.HTTP_201_CREATED)
async def create_device(payload: schema.DeviceCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_device(db, payload)

@router.get("/{device_id}", response_model=schema.DeviceRead)
async def get_device(device_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_device(db, device_id)

@router.patch("/{device_id}", response_model=schema.DeviceRead)
async def update_device(device_id: int, payload: schema.DeviceUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_device(db, device_id, payload)

@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device_id: int, db: AsyncSession = Depends(get_db)):
    await service.delete_device(db, device_id)
