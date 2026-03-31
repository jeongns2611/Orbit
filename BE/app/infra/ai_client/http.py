from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

AI_BASE_URL = os.getenv("AI_BASE_URL", os.getenv("NGROK_URL", "")).rstrip("/")
AI_TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SEC", "30"))

# 고정 경로(대화, 이미지)
AI_CHAT_TEXT_PROCESS_PATH = "/api/v1/ai/chat/text_process"
AI_IMAGE_DESCRIBE_PATH = "/api/v1/ai/image/describe"


class AIRequestTimeoutError(RuntimeError):
    pass


class AIRequestNetworkError(RuntimeError):
    pass


class AIRequestHTTPError(RuntimeError):
    pass


class AIRequestInvalidResponseError(RuntimeError):
    pass


def _build_url(path: str) -> str:
    if not AI_BASE_URL:
        raise ValueError("AI_BASE_URL 이 설정되지 않음")
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{AI_BASE_URL}{normalized}"


async def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = _build_url(path)

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(AI_TIMEOUT_SEC)
        ) as client:
            logger.info("[AI 요청] url=%s", url)
            response = await client.post(url, json=payload)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise AIRequestTimeoutError(
            f"[AI 요청 실패] 타임아웃 ({AI_TIMEOUT_SEC}초)"
        ) from exc
    except httpx.HTTPStatusError as exc:
        code = (
            exc.response.status_code
            if exc.response is not None
            else "알수없음"
        )
        raise AIRequestHTTPError(
            f"[AI 요청 실패] HTTP 상태코드: {code}"
        ) from exc
    except httpx.RequestError as exc:
        raise AIRequestNetworkError(
            f"[AI 요청 실패] 네트워크 오류: {exc}"
        ) from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise AIRequestInvalidResponseError(
            "[AI 응답 오류] JSON 파싱 실패"
        ) from exc

    if isinstance(data, dict):
        return data
    return {"result": data}


async def request_chat_text_process(payload: dict[str, Any]) -> dict[str, Any]:
    """event/conversation 전용"""
    return await _post_json(AI_CHAT_TEXT_PROCESS_PATH, payload)


async def request_image_describe(payload: dict[str, Any]) -> dict[str, Any]:
    """event/img 전용"""
    return await _post_json(AI_IMAGE_DESCRIBE_PATH, payload)
