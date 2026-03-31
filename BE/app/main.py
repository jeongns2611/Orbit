import asyncio
from contextlib import asynccontextmanager

from app.api.router import api_router
from app.core.exception_handlers import (
    app_error_handler,
    unhandled_error_handler,
)
from app.core.exceptions import AppError
from app.infra.mqtt.connection import run_mqtt_listener
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 웹에서만 필요(개발용)


# 서버 시작/종료 시 실행될 MQTT 로직
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[서버 시작 - MQTT 실행중]")
    mqtt_task = asyncio.create_task(run_mqtt_listener())

    yield

    print("[서버 종료 - MQTT 연결 종료]")
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        print("[MQTT 태스크 정상 종료]")


def create_app() -> FastAPI:
    app = FastAPI(title="BE API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:8081",
            "http://127.0.0.1:8081",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    app.include_router(api_router)

    return app


app = create_app()
