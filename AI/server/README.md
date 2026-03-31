# AI Server Specification (MVP)

## 1. 개요

* **목표:** 2세 ~ 4세 유아를 대상으로 하는 AI 대화형 챗봇 서비스 및 일일 요약 리포트 생성 기능의 AI 코어 서버 구축 및 기능 검증.
* **주요 역할:** 텍스트 입력을 기반으로 대화 생성(LLM) 및 일일 요약 리포트 생성, 이미지 설명(VLM) 생성.
* **비고:** STT/TTS는 **온디바이스(클라이언트)**로 이전되었으며, 본 서버는 오디오(Base64) 파이프라인을 수행하지 않습니다.

## 2. 개발 환경 및 공통 설정

* **언어:** Python 3.10 (기준)
* **가상환경:** Conda
* **서버 프레임워크:** FastAPI
* **외부 연결 (MVP):** `ngrok`을 이용한 로컬 포트 터널링 (개발 및 검증 단계 한정)
* **하드웨어:** NVIDIA V100 (32GB VRAM) 1장 활용

## 3. 사용할 라이브러리 (Tech Stack)

* **Web Framework:** `fastapi`, `uvicorn`, `pydantic`
* **LLM/VLM:** `google-genai` (Gemini 연동)
* **Vector DB:** `chromadb` (장기기억/개인화용)
* **ETC:** `PyYAML`, `python-multipart`

## 4. 기능 상세 명세

### 4.1. 인터페이스 (API)

* **프로토콜:** HTTP POST
* **요청 포맷 (Request):** JSON
* **응답 포맷 (Response):** JSON
* **Base Path:** `/api/v1/ai`
* **Endpoints:**
  * `POST /api/v1/ai/chat/text_process`
  * `POST /api/v1/ai/reports/daily`
  * `POST /api/v1/ai/image/describe`
  * `GET /api/v1/ai/image/describe/{job_id}`
  * `GET /api/v1/ai/health`
  * `GET /api/v1/ai/`

### 4.2. LLM (대화 엔진)

* **역할:** 사용자의 질문에 대한 적절한 답변 생성 및 페르소나 유지.
* **모델:** Gemini 계열 (API 호출)
* **입력/출력:** User Text → AI Text

* **프롬프팅 전략:**
* **System Instruction:**
* "너는 아이들의 다정한 친구 '코코'야."
* "어려운 단어는 쓰지 말고, 의성어(칙칙폭폭, 멍멍)와 의태어를 많이 사용해."
* "문장은 짧고 간결하게(10단어 이내) 끊어서 말해."
* "아이의 말에 항상 긍정적으로 공감하고 칭찬해줘."

* **Safety Setting:**
* 유아 정서에 해로운 폭력, 공포, 선정적 콘텐츠 차단 강도 적용.
* 개인정보 유출 방지 규칙 적용.

### 4.3. LLM (일일 요약 리포트 생성)

* **역할:** 하루 동안의 대화 내용을 요약하고, 부모에게 전달할 리포트 생성.
* **모델:** Gemini 계열 (API 호출)
* **엔진:** `google-genai`
* **입력/출력:** log_data(대화/이미지 로그) → report_text

### 4.4. 일일 요약 리포트 API

* **역할:** 하루 동안의 log 데이터를 기반으로 요약 리포트 텍스트를 생성.
* **요청/응답:** JSON
* **Endpoint:** `POST /api/v1/ai/reports/daily`
* **비고:** 요청 payload의 log_data를 기반으로 리포트를 생성합니다.

### 4.5. VLM (이미지 설명)

* **역할:** 이미지(S3 URL)를 기반으로 아이 사진에 대한 설명 텍스트 생성.
* **Endpoint:**
  * `POST /api/v1/ai/image/describe`
  * `GET /api/v1/ai/image/describe/{job_id}`
* **응답:** `short_result_text`, `full_result_text`를 포함한 구조화 결과를 반환합니다.

### 4.6. 장기기억 (Long-term Memory)

* **역할:** 대화에서 추출한 facts/preferences/constraints를 Vector DB(ChromaDB)에 저장하고, 다음 대화 시 system instruction에 `[장기기억]` 블록을 주입합니다.
* **주의:** retrieval은 `device_id` 기준으로 필터링되므로 저장/조회 요청에 동일한 `device_id`가 전달되어야 합니다.

## 5. 데이터 흐름 (Pipeline)

1. **Request:** 클라이언트(온디바이스 STT/TTS 포함)가 AI 서버에 `POST` 요청 (Body는 텍스트/로그/이미지 URL 기반).

2. **Process:**
* `[Chat]` 텍스트 입력 + 히스토리 기반으로 Gemini API를 호출하여 답변 생성.
* `[Report]` 하루 log_data를 입력으로 받아 리포트 생성.
* `[Image]` 이미지 URL 기반으로 설명 텍스트 생성.

3. **Response:** JSON으로 텍스트 결과를 반환.

---

## 5.1. 실행 방법 (개발)

* **서버 실행 (예시):**
  * `AI/server/app` 경로에서 실행
  * `uvicorn main:app --reload`

## 6. 포팅/배포 참고 (Porting Guide)

### 6.1. 실행 환경

* **Python:** 3.10 (권장)
* **Framework:** FastAPI (`uvicorn`)
* **GPU:** CUDA 사용 시 `config.yaml`의 `device`, `cuda_visible_devices`로 제어

### 6.2. 설정 파일

* **`.env`**
  * 필수 키:
    * `GMS_API_KEY`: Gemini 호출용 API Key
  * `app/core/config.py`에서 `GMS_API_KEY` 또는 `gms_api_key`로도 인식합니다.

* **`config.yaml`**
  * 스펙은 `config_default.yaml`과 동일합니다.
  * 주요 설정:
    * `device`: `cpu`, `cuda`, `mps`
    * `cuda_visible_devices`: 사용 GPU 인덱스 문자열
    * `llm_params`:
      * `llm_model_name`, `base_url`
      * `system_instruction` (공통)
      * `chat_system_instruction`, `report_system_instruction`, `image_system_instruction` (기능별 추가)

### 6.3. 외부 서비스

* **Google Gemini (GMS) API**
  * `.env`의 `GMS_API_KEY`가 필요합니다.
  * 네트워크가 차단되면 LLM/VLM 기능이 정상 동작하지 않습니다.

### 6.4. 배포/운영 시 특이사항

* **STT/TTS는 온디바이스로 이전됨**
  * 본 서버는 오디오(Base64) 처리 파이프라인을 수행하지 않고, 텍스트/로그/이미지 URL 기반으로 동작합니다.
* **장기기억(Vector DB) 저장 위치**
  * ChromaDB의 persist 디렉토리는 서버 내부 `.cache/` 하위에 생성됩니다.
  * 컨테이너/배포 환경에서는 해당 경로에 대한 쓰기 권한이 필요합니다.
* **장기기억 조회 필터**
  * retrieval은 `device_id`로 필터링됩니다.
  * 저장/조회 요청에 동일한 `device_id`가 전달되지 않으면 장기기억이 주입되지 않습니다.

---

# 폴더 구조 (Directory Structure)

```plaintext
AI/
└── server/
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                   # FastAPI 앱 실행 (lifespan에서 서비스 초기화)
    │   │
    │   ├── api/
    │   │   ├── __init__.py
    │   │   ├── endpoints.py          # /chat/text_process 등 API 라우터
    │   │   ├── reports.py            # POST /reports/daily
    │   │   ├── system_endpoints.py   # GET /, GET /health
    │   │   └── schemas.py            # 요청/응답 스키마
    │   │
    │   ├── core/
    │   │   ├── __init__.py
    │   │   └── config.py             # 설정 로딩(.env + config.yaml)
    │   │
    │   ├── services/
    │   │   ├── __init__.py
    │   │   ├── bootstrap.py          # 서비스 초기화 오케스트레이션(load/configure)
    │   │   ├── llm_handler.py        # Gemini API 핸들러
    │   │   ├── daily_report.py       # 일일 리포트 생성
    │   │   ├── image_describe_jobs.py # 이미지 설명 Job 처리
    │   │   └── long_term_memory.py   # 장기기억(Vector DB)
    │   │
    │   └── utils/
    │       ├── __init__.py
    │       └── data_utils.py         # Base64 유틸(레거시)
    │
    ├── config.yaml                   # 비밀이 아닌 런타임 설정(device, model path 등)
    ├── .env                          # 시크릿(API Key 등)
    ├── requirements.txt
    └── README.md