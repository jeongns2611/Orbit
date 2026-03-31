import sys
from contextlib import asynccontextmanager
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import logging

import uvicorn
from app.api.endpoints import router as api_router
from app.api.system_endpoints import router as system_router
from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.services.bootstrap import initialize_services
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 서비스 핸들러 임포트 (Lifespan에서 모델 로드용)


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """
    서버 시작/종료 시 실행되는 로직 (Lifespan Events)
    - 시작 시: 무거운 AI 모델들을 GPU 메모리에 로드합니다.
    - 종료 시: 메모리 정리 작업을 수행합니다.
    """
    logger.info("[%s] Server Starting...", settings.PROJECT_NAME)
    try:
        initialize_services(fastapi_app)
    except Exception as e:
        logger.exception("Error loading models")
        # 모델 로드 실패 시 서버 시작을 멈출지, 경고만 할지 결정 필요
        raise e

    yield  # 서버가 실행되는 동안 대기

    # 2. 서버 종료 시 정리 작업
    logger.info("[%s] Server Shutting down...", settings.PROJECT_NAME)
    # 예: db.close(), resource.release() 등


# FastAPI 앱 초기화
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Kids AI Chatbot Core Server (STT-LLM-TTS Pipeline)",
    lifespan=lifespan,
)

register_exception_handlers(app)


# CORS 미들웨어 설정
# (메인 백엔드 서버나 프론트엔드에서 API를 호출할 수 있도록 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 보안상 배포 시에는 구체적인 도메인으로 변경 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
# /api/v1/chat/process 등의 주소가 생성됨
app.include_router(api_router, prefix="/api/v1/ai")
app.include_router(system_router, prefix="/api/v1/ai")


if __name__ == "__main__":
    # python app/main.py 로 직접 실행할 때 사용
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 개발 중에는 코드 수정 시 자동 재시작
    )
