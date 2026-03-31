from app.api.schemas import ImageDescribeJobResponse, ImageDescribeRequest
from app.core.errors import ServiceNotReadyError
from app.services.image_describe_jobs import (
    image_describe_job_store,
    run_image_describe_job,
)
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.post("/image/describe", response_model=ImageDescribeJobResponse)
async def start_image_describe(
    payload: ImageDescribeRequest,
    request: Request,
) -> ImageDescribeJobResponse:
    llm_service = getattr(request.app.state, "llm_service", None)
    if llm_service is None:
        raise ServiceNotReadyError(
            "LLM service is not initialized",
            detail={"service": "llm_service"},
        )

    job = image_describe_job_store.create(
        device_id=payload.device_id,
        s3_url=payload.s3_url,
    )

    await run_image_describe_job(job_id=job.job_id, llm_service=llm_service)
    updated = image_describe_job_store.get(job.job_id)
    if updated is None:
        raise HTTPException(status_code=500, detail="job_missing_after_run")

    return ImageDescribeJobResponse(
        job_id=updated.job_id,
        status=updated.status,
        received_at=updated.received_at,
        started_at=updated.started_at,
        responded_at=updated.responded_at,
        short_result_text=getattr(updated, "short_result_text", None),
        full_result_text=getattr(updated, "full_result_text", None),
        result_text=updated.result_text,
        error=updated.error,
    )


@router.get(
    "/image/describe/{job_id}", response_model=ImageDescribeJobResponse
)
async def get_image_describe(job_id: str) -> ImageDescribeJobResponse:
    job = image_describe_job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job_not_found")

    return ImageDescribeJobResponse(
        job_id=job.job_id,
        status=job.status,
        received_at=job.received_at,
        started_at=job.started_at,
        responded_at=job.responded_at,
        short_result_text=getattr(job, "short_result_text", None),
        full_result_text=getattr(job, "full_result_text", None),
        result_text=job.result_text,
        error=job.error,
    )
