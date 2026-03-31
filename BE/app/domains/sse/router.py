from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.db.session import get_db
from app.core.exceptions import AuthenticationError
from app.domains.sse import schema, service
from app.domains.users.model import User

router = APIRouter(prefix="/app/sse", tags=["sse"])


@router.get("")
async def stream_sse(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    if current_user.device_id is None:
        raise AuthenticationError("Device not linked")

    queue = await service.register_connection(current_user.device_id)
    event_stream = service.sse_event_generator(
        request=request,
        device_id=current_user.device_id,
        queue=queue,
    )
    return StreamingResponse(
        event_stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# 실제 데이터 들어오면 지울 코드 GGUGGU
@router.post(
    "/mock-image",
    response_model=schema.MockImageCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_mock_image(
    payload: schema.MockImageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.device_id is None:
        raise AuthenticationError("Device not linked")

    row = await service.create_mock_image_result(
        db,
        device_id=current_user.device_id,
        payload=payload,
    )
    await db.commit()

    # SSE 알림 보내기 부분 (진짜 데이터 저장 시 실행)
    notified = await service.notify_timeline_image(
        device_id=current_user.device_id,
        result=row,
    )

    return schema.MockImageCreateResponse(
        id=int(row.id),
        event_name=service.SSE_EVENT_TIMELINE_IMAGE,
        notified=notified,
    )
