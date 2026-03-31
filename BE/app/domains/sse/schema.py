from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# 실제 데이터 들어오면 지울 코드 GGUGGU
class MockImageCreateRequest(BaseModel):
    source_event_log_id: int | None = None
    short_result_text: str | None = Field(default="mock image inference result")
    started_at: str | None = None
    input_payload: dict[str, Any] | None = None


# 실제 데이터 들어오면 지울 코드 GGUGGU
class MockImageCreateResponse(BaseModel):
    id: int
    event_name: str
    notified: bool
