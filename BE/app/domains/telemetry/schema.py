from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MQTTBasePayload(BaseModel):
    device_id: str | None = None
    timestamp: datetime | None = None


class HeartbeatPayload(MQTTBasePayload):
    battery_level: int | None = None
    is_driving: bool | None = None
    is_charging: bool | None = None
    wifi_rssi: int | None = None
    system_status: str | None = None


class EventPayload(MQTTBasePayload):
    event_type: str | None = None
    event_data: dict[str, Any] | None = None
    context_id: str | None = None
    data: dict[str, Any] | None = None


class ImageEventPayload(MQTTBasePayload):
    bucket: str
    image_key: str
    device_id: str
    timestamp: datetime | None = None
    image_key: str | None = None
    bucket: str | None = None


class ImageEventPayload(MQTTBasePayload):
    image_key: str | None = None
