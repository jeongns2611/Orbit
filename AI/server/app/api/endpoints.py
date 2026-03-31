"""FastAPI API endpoints for the AI server."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.api.image_endpoints import router as image_router
from app.api.reports import router as reports_router
from app.api.schemas import TextChatRequest, TextChatResponse
from app.core.config import settings
from app.core.errors import ServiceNotReadyError
from app.services.llm_handler import LLMHandler
from fastapi import APIRouter, Depends, HTTPException, Request

_memory_service: Optional[Any]
try:
    from app.services.long_term_memory import (
        memory_service as _imported_memory_service,
    )

    _memory_service = _imported_memory_service
except Exception:
    _memory_service = None

router = APIRouter()
router.include_router(reports_router)
router.include_router(image_router)


logger = logging.getLogger(__name__)


def _effective_device_id(request: TextChatRequest) -> str:
    """Resolve effective device_id from request payload."""
    device_id = getattr(request, "device_id", None)
    if isinstance(device_id, str) and device_id:
        return device_id
    return "local"


def _messages_from_history_pairs(
    history: object,
) -> List[Tuple[str, str]]:
    """Convert history pair list into LLM message tuples."""
    if not isinstance(history, list):
        return []
    out: List[Tuple[str, str]] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        user = item.get("user")
        ai = item.get("ai")
        if isinstance(user, str) and isinstance(ai, str):
            out.append(("user", user))
            out.append(("assistant", ai))
    return out


def _get_chat_history_repo(request: Request) -> Any:
    """Fetch chat history repository from application state."""
    repo = getattr(request.app.state, "chat_history_repo", None)
    if repo is None:
        raise ServiceNotReadyError(
            "chat_history_repo is not initialized",
            detail={"service": "chat_history_repo"},
        )
    return repo


def _normalize_history_items(history: object) -> List[Dict[str, Any]]:
    """Normalize history items to list[dict]."""
    if not isinstance(history, list):
        return []
    out: List[Dict[str, Any]] = []
    for x in history:
        if isinstance(x, dict):
            out.append(x)
            continue
        dump = getattr(x, "model_dump", None)
        if callable(dump):
            try:
                d = dump()
            except Exception:
                continue
            if isinstance(d, dict):
                out.append(d)
    return out


def get_llm_service(request: Request) -> LLMHandler:
    """Dependency injector for LLM service."""
    llm_service = getattr(request.app.state, "llm_service", None)
    if llm_service is None:
        raise ServiceNotReadyError(
            "LLM service is not initialized",
            detail={"service": "llm_service"},
        )
    return llm_service


@router.post("/chat/text_process", response_model=TextChatResponse)
async def chat_text_process(
    request_ctx: Request,
    request: TextChatRequest,
    llm_service: LLMHandler = Depends(get_llm_service),
):
    """멀티턴 테스트용 텍스트 입력 라우터.

    Args:
        request_ctx: FastAPI request context.
        request: 사용자 입력 (예: {"user_text": "안녕"}).
        llm_service: LLM 핸들러.

    Raises:
        HTTPException: LLM 핸들러가 초기화되지 않았을 때 발생.

    Returns:
        TextChatResponse: AI 응답 (예: {"user_text": "안녕", "ai_text": "안녕하세요"}).
    """
    try:
        received_at = datetime.now(timezone.utc).isoformat()
        device_id = _effective_device_id(request)
        repo = _get_chat_history_repo(request_ctx)

        incoming_history = _normalize_history_items(
            getattr(request, "history", None)
        )

        messages = _messages_from_history_pairs(
            incoming_history
            if incoming_history
            else repo.load_recent_by_device(device_id=device_id, limit=5)
        )
        messages.append(("user", request.user_text))

        common_system_instruction = settings.llm.SYSTEM_INSTRUCTION or getattr(
            llm_service, "system_instruction", ""
        )
        chat_system_instruction = settings.llm.CHAT_SYSTEM_INSTRUCTION
        if common_system_instruction and chat_system_instruction:
            base_system_instruction = (
                f"{common_system_instruction}\n\n{chat_system_instruction}"
            )
        else:
            base_system_instruction = (
                common_system_instruction or chat_system_instruction
            )
        system_instruction = base_system_instruction
        if _memory_service is not None:
            system_instruction = (
                await _memory_service.build_system_instruction(
                    base_system_instruction=base_system_instruction,
                    device_id=device_id,
                    user_text=request.user_text,
                    llm_service=llm_service,
                )
            )

        ai_text = await llm_service.generate_response(
            request.user_text,
            messages=messages,
            system_instruction=system_instruction,
        )
        repo.append_exchange(request.user_text, ai_text, device_id=device_id)

        if _memory_service is not None:
            await _memory_service.extract_and_store(
                device_id=device_id,
                llm_service=llm_service,
                recent_history=incoming_history,
                user_text=request.user_text,
                ai_text=ai_text,
            )

        responded_at = datetime.now(timezone.utc).isoformat()
        return TextChatResponse(
            received_at=received_at,
            responded_at=responded_at,
            user_text=request.user_text,
            ai_text=ai_text,
        )
    except Exception as e:
        logger.exception("Error processing text chat")
        raise HTTPException(status_code=500, detail=str(e))
