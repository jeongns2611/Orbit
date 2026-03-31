from datetime import datetime
from sqlalchemy import Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db.base import Base


class Report(Base):
    __tablename__ = "daily_reports"
    __table_args__ = {"schema": "orbit"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    device_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("orbit.devices.id", ondelete="CASCADE"), nullable=True
    )

    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    report_text: Mapped[str] = mapped_column(Text, nullable=False)
