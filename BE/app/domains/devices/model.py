from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer
from app.core.db.base import Base


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = {"schema": "orbit"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    serial_no: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    firmware_version: Mapped[str] = mapped_column(String(32), nullable=False)
