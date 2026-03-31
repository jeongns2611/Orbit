"""Application-level error types.

This module defines domain-oriented exceptions with an `Error` suffix.
These exceptions are intended to be converted into a consistent API response by
FastAPI global exception handlers.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class AppError(Exception):
    """Base exception for application errors.

    Attributes:
        message: Human-readable message.
        code: Stable machine-readable error code.
        status_code: HTTP status code to return.
        detail: Optional structured details for debugging.
    """

    def __init__(
        self,
        message: str,
        *,
        code: str = "app_error",
        status_code: int = 400,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.detail = detail

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "code": self.code,
            "message": self.message,
        }
        if self.detail is not None:
            payload["detail"] = self.detail
        return payload


class ServiceNotReadyError(AppError):
    """Raised when a required service is not initialized."""

    def __init__(
        self,
        message: str = "Service is not ready",
        *,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code="service_not_ready",
            status_code=503,
            detail=detail,
        )


class ModelLoadError(AppError):
    """Raised when model loading fails during startup."""

    def __init__(
        self,
        message: str = "Model load failed",
        *,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code="model_load_failed",
            status_code=500,
            detail=detail,
        )
