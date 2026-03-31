from app.core.config import settings
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    """
    서버 상태 확인용 엔드포인트
    (로드 밸런서나 모니터링 도구가 사용)
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
    }


@router.get("/")
def root():
    """
    루트 경로 접속 시 안내 메시지
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
    }
