# app/api/dependencies.py
from __future__ import annotations


from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from app.core.db.session import get_db
from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationError
from app.domains.users.model import User


def get_current_user_id(
    authorization: str | None = Header(default=None),
) -> int:
    """
    로그인 유저의 access token으로 user id를 알아내는 함수
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("Missing access token")

    token = authorization.replace("Bearer ", "", 1)

    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        raise AuthenticationError("Invalid access token")

    return user_id


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    로그인 유저의 user id로 user 객체를 반환하는 함수
    """
    user = await db.scalar(select(User).where(User.id == user_id))

    if user is None:
        raise AuthenticationError("User not found")

    return user
