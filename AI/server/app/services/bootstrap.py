from __future__ import annotations

"""Application bootstrap helpers.

This module wires services (LLM, chat history repository) into the
FastAPI application state during startup.
"""

import logging
import os

from app.core.config import settings
from app.services.chat_history_repo import ChatHistoryRepository
from app.services.llm_handler import llm_service
from fastapi import FastAPI

logger = logging.getLogger(__name__)


def initialize_services(app: FastAPI) -> None:
    """Initialize and attach services to FastAPI app state."""

    logger.info("[CONFIG] DEVICE=%s", settings.DEVICE)
    logger.info(
        "[CONFIG] CUDA_VISIBLE_DEVICES=%r", settings.CUDA_VISIBLE_DEVICES
    )
    logger.info("[CONFIG] LLM_MODEL_NAME=%s", settings.llm.LLM_MODEL_NAME)
    logger.info("[CONFIG] LLM_BASE_URL=%s", settings.llm.BASE_URL)
    logger.info(
        "[CONFIG] LLM_SYSTEM_INSTRUCTION=%s",
        settings.llm.SYSTEM_INSTRUCTION,
    )

    if getattr(settings, "CUDA_VISIBLE_DEVICES", ""):
        os.environ["CUDA_VISIBLE_DEVICES"] = settings.CUDA_VISIBLE_DEVICES

    logger.info("Loading AI Models...")

    llm_service.configure(
        api_key=settings.GOOGLE_API_KEY,
        llm_model_name=settings.llm.LLM_MODEL_NAME,
        base_url=settings.llm.BASE_URL,
        system_instruction=settings.llm.SYSTEM_INSTRUCTION,
    )

    app.state.llm_service = llm_service

    app.state.chat_history_repo = ChatHistoryRepository()

    logger.info("All Models Loaded Successfully")
