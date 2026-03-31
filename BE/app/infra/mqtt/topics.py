import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "orbit")

# (Device -> Server) 토픽 규칙
MQTT_SUBSCRIBE_RULES = [
    {"topic": f"{TOPIC_PREFIX}/+/status/heartbeat", "qos": 0},
    {"topic": f"{TOPIC_PREFIX}/+/event/img", "qos": 1},
    {"topic": f"{TOPIC_PREFIX}/+/event/conversation", "qos": 1},
]

# (Server -> Device) 토픽 suffix
MQTT_CONTROL_SUFFIX = os.getenv("MQTT_CONTROL_SUFFIX", "conversation")


@dataclass(frozen=True)
class ParsedTopic:
    device_id: str
    category: str
    sub_path: str
    qos: int


def parse_orbit_topic(topic: str) -> Optional[ParsedTopic]:
    """
    topic 예시:
      orbit/device_01/status/heartbeat
      orbit/device_01/event/img
      orbit/device_01/event/conversation
    """
    parts = topic.split("/")
    if len(parts) < 4:
        return None
    if parts[0] != TOPIC_PREFIX:
        return None

    device_id = parts[1]
    category = parts[2]
    sub_path = "/".join(parts[3:])

    if category == "status" and sub_path == "heartbeat":
        return ParsedTopic(
            device_id=device_id, category=category, sub_path=sub_path, qos=0
        )

    if category == "event" and sub_path in {"img", "conversation"}:
        return ParsedTopic(
            device_id=device_id, category=category, sub_path=sub_path, qos=1
        )

    return None


def build_control_topic(device_id: str) -> str:
    # Server -> Device 제어 토픽
    return f"{TOPIC_PREFIX}/{device_id}/{MQTT_CONTROL_SUFFIX}"
