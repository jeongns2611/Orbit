-- =============================================
-- [ORBIT DATABASE FULL DDL - CLEAN VERSION]
-- 수정일: 2026. 02. 04.
-- 삭제된 테이블: voice_chat_sessions, voice_chat_messages, metas, images
-- =============================================

-- 1) 기존 스키마 초기화
DROP SCHEMA IF EXISTS orbit CASCADE;

-- 2) 스키마 생성 및 경로 설정
CREATE SCHEMA orbit;
SET search_path TO orbit, public;

-- 3) ENUM 타입 정의
CREATE TYPE orbit.gender_enum AS ENUM ('M', 'F');
CREATE TYPE orbit.event_type_enum AS ENUM ('IMG', 'CONVERSATION');

-- 4) 공통 트리거 함수 생성
CREATE OR REPLACE FUNCTION orbit.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------
-- [1] 기기 및 사용자 테이블
-- ---------------------------------------------

-- 기기 테이블
CREATE TABLE orbit.devices (
    id SERIAL PRIMARY KEY,
    serial_no VARCHAR(64) NOT NULL UNIQUE,
    model_name VARCHAR(64) NOT NULL,
    firmware_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 테이블
CREATE TABLE orbit.users (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES orbit.devices(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    pw TEXT NOT NULL,
    name VARCHAR(50),
    nickname VARCHAR(50) NOT NULL,
    birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리프레시 토큰
CREATE TABLE orbit.auth_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES orbit.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------
-- [2] 로그 및 분석 테이블
-- ---------------------------------------------

-- 기기 이벤트 로그
CREATE TABLE orbit.device_event_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES orbit.devices(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    event_type TEXT NOT NULL, -- 추후 enum 타입으로 변경
    ts TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기기 상태 로그
CREATE TABLE orbit.device_status_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES orbit.devices(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status_type TEXT NOT NULL, -- 추후 enum 타입으로 변경
    ts TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 추론 작업 관리
CREATE TABLE orbit.ai_inference_jobs (
    id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES orbit.devices(id) ON DELETE CASCADE,
    source_event_logs_id BIGINT REFERENCES orbit.device_event_logs(id) ON DELETE CASCADE,
    request_topic VARCHAR(255),
    response_topic VARCHAR(255),
    input_payload JSONB NOT NULL,
    ai_response jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 이미지 결과
CREATE TABLE orbit.ai_img_result (
    id BIGSERIAL PRIMARY KEY,
    device_id INT REFERENCES orbit.devices(id) ON DELETE SET NULL,
    source_event_log_id BIGINT REFERENCES orbit.device_event_logs(id) ON DELETE CASCADE,
    input_payload JSONB,
    ai_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------
-- [3] 리포트 및 아동 관리
-- ---------------------------------------------

-- 데일리 리포트
CREATE TABLE orbit.daily_reports (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES orbit.devices(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    report_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 아동 정보 (image_id 컬럼 제거됨)
CREATE TABLE orbit.children (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES orbit.devices(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    birth DATE NOT NULL,
    gender orbit.gender_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------
-- [4] 인덱스 설정
-- ---------------------------------------------

CREATE INDEX idx_auth_tokens_user ON orbit.auth_refresh_tokens(user_id);
CREATE INDEX idx_status_logs_device_ts ON orbit.device_status_logs(device_id, ts DESC);
CREATE INDEX idx_event_logs_device_ts ON orbit.device_event_logs(device_id, ts DESC);
CREATE INDEX idx_ai_jobs_source_event ON orbit.ai_inference_jobs(source_event_logs_id);

-- ---------------------------------------------
-- [5] 트리거 적용 (updated_at 자동 갱신)
-- ---------------------------------------------

-- 시연용 기기 데이터
INSERT INTO devices (serial_no, model_name, firmware_version) VALUES ('A304-DEV-0001', 'OrbitCare-V1', 'v1.0');

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'orbit' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('ai_img_result') -- updated_at 컬럼이 없는 테이블은 제외
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_modtime BEFORE UPDATE ON orbit.%I FOR EACH ROW EXECUTE FUNCTION orbit.update_timestamp()', t, t);
    END LOOP;
END;
$$;