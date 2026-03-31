# app/domains/auth/service.py
from __future__ import annotations

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token_raw,
    hash_password,
    hash_refresh_token,
    refresh_expires_at,
    utcnow,
    verify_password,
)
from app.domains.auth import repository as auth_repo
from app.domains.auth.schema import TokenResponse
from app.domains.users import repository as users_repo


class AuthError(Exception):
    """도메인 레벨 인증 오류(라우터에서 HTTPException으로 변환)."""


async def register(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    nickname: str,
    name: str | None,
    birth,
) -> TokenResponse:
    async with db.begin():
        existing = await users_repo.get_user_by_email(db, email)
        if existing:
            # 409로 매핑 권장
            raise AuthError("EMAIL_ALREADY_EXISTS")

        pw_hash = hash_password(password)
        user = await users_repo.create_user(
            db,
            email=email,
            pw_hash=pw_hash,
            nickname=nickname,
            name=name,
            birth=birth,
        )

        access = create_access_token(sub=str(user.id))
        refresh_raw = create_refresh_token_raw()
        refresh_hash = hash_refresh_token(refresh_raw)

        await auth_repo.create_refresh_token_row(
            db,
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at(),
        )

    return TokenResponse(
        access_token=access,
        refresh_token=refresh_raw,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def login(
    db: AsyncSession,
    *,
    email: str,
    password: str,
) -> TokenResponse:
    async with db.begin():
        user = await users_repo.get_user_by_email(db, email)
        if not user:
            raise AuthError("INVALID_CREDENTIALS")

        if not verify_password(password, user.pw):
            raise AuthError("INVALID_CREDENTIALS")

        access = create_access_token(sub=str(user.id))
        refresh_raw = create_refresh_token_raw()
        refresh_hash = hash_refresh_token(refresh_raw)
        
        await auth_repo.create_refresh_token_row(
            db,
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires_at(),
        )

    return TokenResponse(
        access_token=access,
        refresh_token=refresh_raw,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def logout(
    db: AsyncSession,
    *,
    refresh_token: str,
) -> None:
    # 정책: 항상 200 OK (멱등)
    refresh_hash = hash_refresh_token(refresh_token)
    
    async with db.begin():
        await auth_repo.delete_refresh_by_hash(db, refresh_hash)


async def refresh_access_token(
    db: AsyncSession,
    *,
    refresh_token: str,
) -> TokenResponse:
    """
    refresh_token을 DB에서 검증하고, access_token만 재발급한다.
    (MVP: refresh rotate 없음)
    """
    refresh_hash = hash_refresh_token(refresh_token)

    async with db.begin():
        row = await auth_repo.get_refresh_by_hash(db, refresh_hash)
        if not row:
            raise AuthError("INVALID_REFRESH")

        # 만료 확인
        now = utcnow()
        if row.expires_at <= now:
            raise AuthError("INVALID_REFRESH")

        # 유효하면 access 재발급
        access = create_access_token(sub=str(row.user_id))

    # refresh는 그대로 반환(회전 없음)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )