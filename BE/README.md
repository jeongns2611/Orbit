# Backend Server (FastAPI, PostgreSQL, MQTT, AI Gateway)

## 프로젝트 개요 (Project Overview)
- 아동 추적 로봇의 이벤트/상태를 수집하고 AI 서버와 연동해 캡션·리포트를 생성하는 API 서버.

## 핵심 기능 (Key Features)
- JWT 기반 인증 및 회원·디바이스 관리.
- MQTT 수신 → AI 요청(텍스트/이미지) → 결과 저장 및 MQTT 응답.
- SSE로 디바이스 상태·이미지 이벤트 스트리밍.
- S3 프리사인드 URL 생성, 일일 리포트 생성/조회.

## 기술 스택 (Tech Stack)
- Language: Python 3.10
- Framework: FastAPI + Uvicorn
- DB: PostgreSQL (SQLAlchemy Async, asyncpg)
- Messaging: MQTT (aiomqtt)
- Storage: AWS S3 (boto3)
- HTTP: httpx
- Auth: JWT (PyJWT), bcrypt
- Container: Docker, docker-compose

## 환경 변수 설정 (Environment Variables)
필수:
- `DATABASE_URL=postgresql+asyncpg://USER:PW@HOST:5432/orbit`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- `AI_BASE_URL` (예: https://your-ai-server/api/v1/ai)
- `MQTT_HOST`, `MQTT_PORT`(1883), `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX`(orbit), `MQTT_CONTROL_SUFFIX`(conversation)
- `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
선택: `AI_TIMEOUT_SEC`, `PIPELINE_CONCURRENCY`, `S3_PRESIGN_EXPIRES_SECONDS`, `S3_IMAGE_PREFIX`, `TZ`

## 프로젝트 구조 (Project Structure)
- `app/main.py` : FastAPI 앱 생성, MQTT 리스너 수명주기 관리
- `app/api/router.py` : 버전별 라우터 집합
- `app/domains/` : 도메인별 모델·서비스·라우터 (`auth`, `users`, `devices`, `telemetry`, `sse`, `reports` 등)
- `app/infra/` : 외부 연동 (MQTT, AI HTTP client, S3 storage)
- `app/core/` : 설정, 보안(JWT), DB 세션
- `database/init.sql` : 전체 스키마 DDL
- `Dockerfile`, `requirements.txt`

## 실행 및 배포 가이드 (Getting Started)
로컬 실행(가상환경 권장):
```bash
cd BE
python -m venv .venv && .\.venv\Scripts\activate   # Windows 예시
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Docker/Compose(루트에서):
```bash
docker compose up -d db mosquitto api 
```

## API 문서 확인 방법 (API Documentation)
- 서버 구동 후: `http://localhost:8000/docs` (Swagger UI), `http://localhost:8000/redoc`
- JWT 필요한 엔드포인트는 `Authorization: Bearer {access_token}` 헤더 사용.
