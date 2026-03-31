# app/domains/users/repository.py
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.users.model import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    q = select(User).where(User.email == email)
    res = await db.execute(q)
    return res.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    pw_hash: str,
    nickname: str,
    name: str | None = None,
    birth=None,
) -> User:
    user = User(email=email, pw=pw_hash, nickname=nickname, name=name, birth=birth)
    db.add(user)
    await db.flush()  # user.id 확보
    return user