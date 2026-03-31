# app/domains/children/schema.py
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChildCreate(BaseModel):
    name: str = Field(..., max_length=50)
    birth: date
    gender: Literal["M", "F"]
    notes: str | None = None


class ChildNotesUpdate(BaseModel):
    notes: str | None = None


class ChildOut(BaseModel):
    id: int
    device_id: int | None

    name: str
    birth: date
    gender: Literal["M", "F"]
    notes: str | None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
