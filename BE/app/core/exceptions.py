# app/core/exceptions.py


class AppError(Exception):
    status_code = 500
    code = "APP_ERROR"

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class AuthenticationError(AppError):
    status_code = 401
    code = "AUTHENTICATION_ERROR"


class ValidationError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"
