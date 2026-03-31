from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def now_iso_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_iso_kst() -> str:
    return datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Seoul")).isoformat()
