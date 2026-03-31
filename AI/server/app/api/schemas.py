"""Pydantic request/response schemas for the AI server API."""

from typing import Any, List, Optional

from pydantic import BaseModel, Field


class HistoryPair(BaseModel):
    """Text chat history pair."""

    user: str
    ai: str


class TextChatRequest(BaseModel):
    """Text chat request schema."""

    device_id: str
    user_text: str
    history: Optional[List[HistoryPair]] = None


class TextChatResponse(BaseModel):
    """Text chat response schema."""

    received_at: str
    responded_at: str
    user_text: str
    ai_text: str


class DailyReportRequest(BaseModel):
    """Daily report request schema."""

    user_id: str
    date: str = Field(..., description="Report date (e.g., 2026-01-26)")
    log_data: Any = Field(
        ..., description="Conversation logs/metadata as JSON"
    )


class DailyReportResponse(BaseModel):
    """Daily report response schema."""

    received_at: str
    responded_at: str
    user_id: str
    date: str
    report_text: str


class ImageDescribeRequest(BaseModel):
    """Image describe request schema."""

    device_id: str
    s3_url: str


class ImageDescribeStartResponse(BaseModel):
    """Image describe start response schema."""

    job_id: str
    status: str
    received_at: str


class ImageDescribeJobResponse(BaseModel):
    """Image describe job response schema."""

    job_id: str
    status: str
    received_at: str
    started_at: Optional[str] = None
    responded_at: Optional[str] = None
    short_result_text: Optional[str] = None
    full_result_text: Optional[str] = None
    result_text: Optional[str] = None
    error: Optional[str] = None
