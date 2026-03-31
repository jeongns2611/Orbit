# app/domains/users/model.py
from __future__ import annotations

from datetime import date, datetime
from sqlalchemy import Date, DateTime, String, Text, func, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "orbit"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    device_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="SET NULL"),
        nullable=True,
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    pw: Mapped[str] = mapped_column(Text, nullable=False)

    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    birth: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
