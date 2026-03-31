"""Daily report generation helpers.

This module builds a parent-facing daily report from chat logs and image
captions, using an injected LLM service.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.llm_handler import LLMHandler


def _clean_text(text: str) -> str:
    """Normalize user/AI text coming from logs."""
    cleaned = text.strip()
    if cleaned.startswith("&"):
        cleaned = cleaned.lstrip("&").strip()
    return cleaned


def _parse_dt(value: Any) -> Optional[datetime]:
    """Parse an ISO8601 datetime string.

    Args:
        value: Input value from log payload.

    Returns:
        Parsed datetime if valid. Otherwise, None.
    """
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _extract_chat_history_from_log_data(log_data: Any) -> List[Dict[str, Any]]:
    """Extract chat history items from log data."""
    if not isinstance(log_data, dict):
        return []
    chat_history = log_data.get("chat_history")
    if not isinstance(chat_history, list):
        return []

    items: List[Dict[str, Any]] = []
    for item in chat_history:
        if not isinstance(item, dict):
            continue
        user = item.get("user")
        ai = item.get("ai")
        if not (isinstance(user, str) and isinstance(ai, str)):
            continue
        payload: Dict[str, Any] = {
            "user": _clean_text(user),
            "ai": _clean_text(ai),
        }
        dt = _parse_dt(item.get("date"))
        if dt is not None:
            payload["dt"] = dt
        items.append(payload)
    return items


def _extract_image_captions_from_log_data(
    log_data: Any,
) -> List[Dict[str, Any]]:
    """Extract image caption items from log data."""
    if not isinstance(log_data, dict):
        return []
    image_caption = log_data.get("image_caption")
    if not isinstance(image_caption, list):
        return []

    items: List[Dict[str, Any]] = []
    for item in image_caption:
        if not isinstance(item, dict):
            continue
        full_text = item.get("full_text")
        if not isinstance(full_text, str) or not full_text.strip():
            continue
        payload: Dict[str, Any] = {"full_text": full_text.strip()}
        dt = _parse_dt(item.get("date"))
        if dt is not None:
            payload["dt"] = dt
        items.append(payload)
    return items


def _build_timeline_text(
    *,
    chat_items: List[Dict[str, Any]],
    caption_items: List[Dict[str, Any]],
    max_items: int = 80,
    max_chars: int = 6000,
) -> str:
    """Build a time-ordered text timeline from chat and image captions."""
    timeline: List[Dict[str, Any]] = []
    for item in chat_items:
        timeline.append({"kind": "chat", **item})
    for item in caption_items:
        timeline.append({"kind": "image_caption", **item})

    def _sort_key(x: Dict[str, Any]) -> tuple[int, Optional[datetime]]:
        dt = x.get("dt")
        return (0, dt) if dt is not None else (1, None)

    timeline.sort(key=_sort_key)
    selected = timeline[-max_items:]

    lines: List[str] = []
    for item in selected:
        kind = item.get("kind")

        if kind == "chat":
            user = item.get("user", "")
            ai = item.get("ai", "")
            lines.append(f"아이: {user}")
            lines.append(f"AI: {ai}")
        elif kind == "image_caption":
            full_text = item.get("full_text", "")
            lines.append(f"이미지: {full_text}")

    text = "\n".join(lines).strip()
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def _build_daily_report_prompt(
    *, user_id: str, date: str, conversation_text: str
) -> str:
    """Create the LLM prompt for daily report generation."""
    return (
        f"메타정보: user_id={user_id}, date={date}\n\n"
        "대화 기록:\n"
        f"{conversation_text}\n"
    )


async def generate_daily_report_text(
    *,
    user_id: str,
    date: str,
    llm_service: LLMHandler,
    log_data: Optional[Any] = None,
) -> str:
    """Generate a daily report text from the given log payload."""
    chat_items = (
        _extract_chat_history_from_log_data(log_data)
        if log_data is not None
        else []
    )
    caption_items = (
        _extract_image_captions_from_log_data(log_data)
        if log_data is not None
        else []
    )

    timeline_text = _build_timeline_text(
        chat_items=chat_items,
        caption_items=caption_items,
    )
    if not timeline_text:
        return "기록이 없어 일일 리포트를 생성할 수 없습니다."

    prompt = _build_daily_report_prompt(
        user_id=user_id,
        date=date,
        conversation_text=timeline_text,
    )

    common_system_instruction = settings.llm.SYSTEM_INSTRUCTION
    report_system_instruction = settings.llm.REPORT_SYSTEM_INSTRUCTION
    if common_system_instruction and report_system_instruction:
        system_instruction = (
            f"{common_system_instruction}\n\n{report_system_instruction}"
        )
    else:
        system_instruction = (
            common_system_instruction or report_system_instruction or None
        )

    report_text = await llm_service.generate_response(
        prompt,
        system_instruction=system_instruction,
        request_kind="report",
    )
    if isinstance(report_text, str) and report_text.strip():
        return report_text.strip()

    return "일일 리포트 생성에 실패했습니다."
