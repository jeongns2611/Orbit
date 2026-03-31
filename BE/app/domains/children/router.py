# app/domains/children/router.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.db.session import get_db
from app.domains.children.schema import ChildCreate, ChildNotesUpdate, ChildOut
from app.domains.children.service import (
    create_child,
    get_first_child_by_user_device,
    update_latest_child_notes_by_user_device,
)
from app.domains.users.model import User


router = APIRouter(prefix="/app/children", tags=["children"])


@router.post("", response_model=ChildOut)
async def post_children(
    payload: ChildCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChildOut:
    child = await create_child(db, user=current_user, payload=payload)
    return ChildOut.model_validate(child)


@router.get("", response_model=ChildOut)
async def get_children(
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChildOut:
    child = await get_first_child_by_user_device(db, user=current_user)
    return ChildOut.model_validate(child)


@router.patch("", response_model=ChildOut)
async def patch_children(
    payload: ChildNotesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChildOut:
    child = await update_latest_child_notes_by_user_device(
        db,
        user=current_user,
        payload=payload,
    )
    return ChildOut.model_validate(child)
