# app/domains/children/model.py
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.base import Base

gender_enum = PGEnum("M", "F", name="gender_enum", create_type=False, schema="orbit")


class Child(Base):
    # 이미지 삽입 관련 컬럼이 없음, 이미지 구현 완료되면 추가 필요

    __tablename__ = "children"
    __table_args__ = {"schema": "orbit"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    device_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="CASCADE"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    birth: Mapped[date] = mapped_column(Date, nullable=False)

    gender: Mapped[str] = mapped_column(gender_enum, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
