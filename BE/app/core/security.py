# app/core/security.py
from __future__ import annotations

import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ===== Password (bcrypt) =====
def hash_password(plain_password: str) -> str:
    if not plain_password or len(plain_password) < 8:
        # MVP 기준 최소 길이 (원하면 정책 변경)
        raise ValueError("Password must be at least 8 characters.")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    if not plain_password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except Exception:
        return False


# ===== Access Token (JWT) =====
def create_access_token(*, sub: str, expires_minutes: int | None = None) -> str:
    now = utcnow()
    exp = now + timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])


# ===== Refresh Token (random + DB hash) =====
def create_refresh_token_raw() -> str:
    # URL-safe, 충분히 긴 랜덤 토큰
    return secrets.token_urlsafe(48)


def hash_refresh_token(raw_refresh_token: str) -> str:
    """
    refresh 원문을 DB에 저장하지 않고, 서버 비밀키로 HMAC 해시만 저장
    """
    if not raw_refresh_token:
        raise ValueError("refresh token is empty")
    digest = hmac.new(
        key=SECRET_KEY.encode("utf-8"),
        msg=raw_refresh_token.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return digest


def refresh_expires_at() -> datetime:
    return utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
