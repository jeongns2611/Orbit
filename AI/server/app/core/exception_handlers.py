"""FastAPI global exception handlers.

This module provides a single registration entrypoint to install consistent
error responses across the API.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from app.core.errors import AppError
from app.utils.datetime_utils import now_iso_utc
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    detail: Any = None,
) -> JSONResponse:
    payload: Dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
        "timestamp": now_iso_utc(),
    }
    if detail is not None:
        payload["error"]["detail"] = detail
    return JSONResponse(status_code=status_code, content=payload)


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers on a FastAPI app."""

    @app.exception_handler(AppError)
    async def handle_app_error(
        request: Request,
        exc: AppError,
    ) -> JSONResponse:
        logger.warning(
            "AppError path=%s status=%s code=%s msg=%s",
            request.url.path,
            exc.status_code,
            exc.code,
            exc.message,
        )
        return _error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            detail=exc.detail,
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        logger.info(
            "HTTPException path=%s status=%s detail=%s",
            request.url.path,
            exc.status_code,
            exc.detail,
        )
        return _error_response(
            status_code=int(exc.status_code),
            code="http_exception",
            message=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        logger.info(
            "RequestValidationError path=%s errors=%s",
            request.url.path,
            exc.errors(),
        )
        return _error_response(
            status_code=422,
            code="validation_error",
            message="Request validation failed",
            detail=exc.errors(),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled exception path=%s type=%s",
            request.url.path,
            type(exc).__name__,
        )
        return _error_response(
            status_code=500,
            code="internal_server_error",
            message="Internal server error",
        )
