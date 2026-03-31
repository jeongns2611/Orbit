# app/domains/children/service.py
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.domains.children.model import Child
from app.domains.children.schema import ChildCreate, ChildNotesUpdate
from app.domains.users.model import User


async def create_child(
    db: AsyncSession,
    *,
    user: User,
    payload: ChildCreate,
) -> Child:

    # device 연결 확인
    if user.device_id is None:
        # 반드시 유저가 기기를 등록한 후 아이 생성 가능
        raise ValidationError("Device not linked")

    # children 생성
    child = Child(
        device_id=user.device_id,
        name=payload.name,
        birth=payload.birth,
        gender=payload.gender,
        notes=payload.notes,
    )

    db.add(child)

    await db.flush()
    await db.refresh(child)
    return child


async def get_first_child_by_user_device(
    db: AsyncSession,
    *,
    user: User,
) -> Child:

    # device 연결 확인
    if user.device_id is None:
        raise ValidationError("Device not linked")

    # device 기준 children 조회 (가장 먼저 생성된 1명만)
    stmt = (
        select(Child)
        .where(Child.device_id == user.device_id)
        .order_by(Child.created_at.asc())
        .limit(1)
    )
    child = await db.scalar(stmt)

    if child is None:
        raise NotFoundError("Child not found")

    return child


async def update_latest_child_notes_by_user_device(
    db: AsyncSession,
    *,
    user: User,
    payload: ChildNotesUpdate,
) -> Child:
    if user.device_id is None:
        raise ValidationError("Device not linked")

    stmt = (
        select(Child)
        .where(Child.device_id == user.device_id)
        .order_by(Child.created_at.asc())
        .limit(1)
    )
    child = await db.scalar(stmt)

    if child is None:
        raise NotFoundError("Child not found")

    notes = payload.notes
    if notes is not None and notes.strip() == "":
        notes = None

    child.notes = notes

    await db.flush()
    await db.refresh(child)
    return child
