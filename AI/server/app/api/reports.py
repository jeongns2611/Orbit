from datetime import datetime, timezone

from app.api.schemas import DailyReportRequest, DailyReportResponse
from app.core.errors import ServiceNotReadyError
from app.services.daily_report import generate_daily_report_text
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.post("/reports/daily", response_model=DailyReportResponse)
async def create_daily_report(
    payload: DailyReportRequest,
    request: Request,
) -> DailyReportResponse:
    llm_service = getattr(request.app.state, "llm_service", None)
    if llm_service is None:
        raise ServiceNotReadyError(
            "LLM service is not initialized",
            detail={"service": "llm_service"},
        )

    report_text = await generate_daily_report_text(
        user_id=payload.user_id,
        date=payload.date,
        llm_service=llm_service,
        log_data=payload.log_data,
    )

    received_at = datetime.now(timezone.utc).isoformat()
    responded_at = datetime.now(timezone.utc).isoformat()

    return DailyReportResponse(
        received_at=received_at,
        responded_at=responded_at,
        user_id=payload.user_id,
        date=payload.date,
        report_text=report_text,
    )
