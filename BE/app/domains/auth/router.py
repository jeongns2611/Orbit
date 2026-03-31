# app/domains/auth/router.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.db.session import get_db
from app.core.security import verify_password
from app.domains.auth import service
from app.domains.auth.schema import (
    RegisterRequest,
    LoginRequest,
    LogoutRequest,
    TokenResponse,
    RefreshRequest,
    PasswordVerifyRequest,
    PasswordVerifyResponse,
)
from app.domains.users.model import User

router = APIRouter(prefix="/app/auth", tags=["auth"])


@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register_api(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    회원가입
    """
    try:
        return await service.register(
            db,
            email=str(payload.email),
            password=payload.password,
            nickname=payload.nickname,
            name=payload.name,
            birth=payload.birth,
        )
    except service.AuthError as e:
        if str(e) == "EMAIL_ALREADY_EXISTS":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Register failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login_api(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    로그인
    """
    try:
        return await service.login(
            db,
            email=str(payload.email),
            password=payload.password,
        )
    except service.AuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_api(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    """
    로그아웃
    """
    await service.logout(db, refresh_token=payload.refresh_token)
    return {"ok": True}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_api(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    토큰 재발급
    """
    try:
        return await service.refresh_access_token(
            db, refresh_token=payload.refresh_token
        )
    except service.AuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post(
    "/password", response_model=PasswordVerifyResponse, status_code=status.HTTP_200_OK
)
async def verify_password_api(
    payload: PasswordVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    비밀번호 재확인
    """
    ok = verify_password(payload.password, current_user.pw)
    return {"ok": ok}
