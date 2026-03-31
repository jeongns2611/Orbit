import asyncio
import html
import logging
import uuid
from dataclasses import dataclass
from threading import Lock
from typing import Dict, Optional

from app.core.config import settings
from app.utils.datetime_utils import now_iso_kst
from app.utils.json_utils import extract_first_json_object

logger = logging.getLogger(__name__)


@dataclass
class ImageDescribeJob:
    job_id: str
    device_id: str
    s3_url: str
    status: str
    received_at: str
    started_at: Optional[str] = None
    responded_at: Optional[str] = None
    short_result_text: Optional[str] = None
    full_result_text: Optional[str] = None
    result_text: Optional[str] = None
    error: Optional[str] = None


class ImageDescribeJobStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._jobs: Dict[str, ImageDescribeJob] = {}

    def create(self, *, device_id: str, s3_url: str) -> ImageDescribeJob:
        job_id = str(uuid.uuid4())
        job = ImageDescribeJob(
            job_id=job_id,
            device_id=device_id,
            s3_url=s3_url,
            status="pending",
            received_at=now_iso_kst(),
        )
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[ImageDescribeJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                logger.warning(
                    "ImageDescribeJobStore.update job not found job_id=%s fields=%s",
                    job_id,
                    sorted(fields.keys()),
                )
                return
            for k, v in fields.items():
                if hasattr(job, k):
                    setattr(job, k, v)
                else:
                    logger.warning(
                        "ImageDescribeJobStore.update unknown field=%s job_id=%s",
                        k,
                        job_id,
                    )


image_describe_job_store = ImageDescribeJobStore()


def _parse_describe_result(raw: str) -> tuple[str, str]:
    parsed = extract_first_json_object(raw)
    short_text: Optional[str] = None
    full_text: Optional[str] = None
    if parsed is not None:
        s = parsed.get("short_result_text")
        f = parsed.get("full_result_text")
        if isinstance(s, str) and s.strip():
            short_text = s.strip()
        if isinstance(f, str) and f.strip():
            full_text = f.strip()

    if full_text is None:
        full_text = raw
    if short_text is None:
        short_text = _to_short_text(full_text)
    return short_text, full_text


def _to_short_text(text: str, *, max_len: int = 60) -> str:
    cleaned = text.strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."


async def run_image_describe_job(*, job_id: str, llm_service) -> None:
    job = image_describe_job_store.get(job_id)
    if job is None:
        return

    image_describe_job_store.update(
        job_id,
        status="running",
        started_at=now_iso_kst(),
    )

    prompt = ""

    try:
        common_system_instruction = settings.llm.SYSTEM_INSTRUCTION
        image_system_instruction = settings.llm.IMAGE_SYSTEM_INSTRUCTION
        if common_system_instruction and image_system_instruction:
            system_instruction = (
                f"{common_system_instruction}\n\n{image_system_instruction}"
            )
        else:
            system_instruction = (
                common_system_instruction or image_system_instruction or None
            )
        result = await llm_service.generate_response_with_image_uri(
            prompt=prompt,
            image_uri=job.s3_url,
            system_instruction=system_instruction,
        )
        raw = result if isinstance(result, str) else ""
        raw = html.unescape(raw).strip()
        if not raw:
            raise RuntimeError("empty_response")

        short_text, full_text = _parse_describe_result(raw)

        image_describe_job_store.update(
            job_id,
            status="succeeded",
            short_result_text=short_text,
            full_result_text=full_text,
            result_text=short_text,
            responded_at=now_iso_kst(),
        )
    except Exception as e:
        logger.exception("Image describe job failed job_id=%s", job_id)
        image_describe_job_store.update(
            job_id,
            status="failed",
            error=str(e),
            responded_at=now_iso_kst(),
        )


def schedule_image_describe_job(*, job_id: str, llm_service) -> None:
    asyncio.create_task(
        run_image_describe_job(job_id=job_id, llm_service=llm_service)
    )
