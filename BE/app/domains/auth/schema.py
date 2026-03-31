# app/domains/auth/schema.py
from __future__ import annotations

from datetime import date
from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    nickname: str = Field(min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=50)
    birth: date | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=10)

class TokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    refresh_token: str
    expires_in: int  # seconds

class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)

class AccessTokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    expires_in: int  # seconds

class PasswordVerifyRequest(BaseModel):
    password: str = Field(min_length=1)

class PasswordVerifyResponse(BaseModel):
    ok: bool
