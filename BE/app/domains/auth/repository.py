# app/domains/auth/repository.py
from __future__ import annotations

from datetime import datetime
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.model import AuthRefreshToken


async def create_refresh_token_row(
    db: AsyncSession,
    *,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
) -> AuthRefreshToken:
    row = AuthRefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(row)
    await db.flush()
    return row


async def get_refresh_by_hash(db: AsyncSession, token_hash: str) -> AuthRefreshToken | None:
    q = select(AuthRefreshToken).where(AuthRefreshToken.token_hash == token_hash)
    res = await db.execute(q)
    return res.scalar_one_or_none()


async def delete_refresh_by_hash(db: AsyncSession, token_hash: str) -> bool:
    stmt = delete(AuthRefreshToken).where(AuthRefreshToken.token_hash == token_hash)
    res = await db.execute(stmt)
    return (res.rowcount or 0) > 0
