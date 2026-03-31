from app.core.db.base import Base
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text


class DeviceStatusLog(Base):
    __tablename__ = "device_status_logs"
    __table_args__ = {"schema": "orbit"}

    id = Column(BigInteger, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    payload = Column(JSONB, nullable=False)
    status_type = Column(String, nullable=False)  # 'HEARTBEAT'
    ts = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DeviceEventLog(Base):
    __tablename__ = "device_event_logs"
    __table_args__ = {"schema": "orbit"}

    id = Column(BigInteger, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    payload = Column(JSONB, nullable=False)
    event_type = Column(String, nullable=False)  # 'IMG', 'CONVERSATION'
    ts = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AiInferenceJob(Base):
    __tablename__ = "ai_inference_jobs"
    __table_args__ = {"schema": "orbit"}

    id = Column(BigInteger, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_event_logs_id = Column(
        BigInteger,
        ForeignKey("orbit.device_event_logs.id", ondelete="CASCADE"),
        nullable=True,
    )
    request_topic = Column(String(255), nullable=True)
    response_topic = Column(String(255), nullable=True)
    input_payload = Column(JSONB, nullable=False)
    ai_response = Column(JSONB, nullable=True)
    status = Column(
        String(16),
        nullable=False,
        server_default=text("'PENDING'"),
    )
    error_message = Column(Text, nullable=True)
    requested_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AiImgResult(Base):
    __tablename__ = "ai_img_result"
    __table_args__ = {"schema": "orbit"}

    id = Column(BigInteger, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("orbit.devices.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_event_log_id = Column(
        BigInteger,
        ForeignKey("orbit.device_event_logs.id", ondelete="CASCADE"),
        nullable=True,
    )
    input_payload = Column(JSONB, nullable=True)
    ai_response = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
