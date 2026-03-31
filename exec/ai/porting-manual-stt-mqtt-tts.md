# 포팅 매뉴얼 (Jetson Nano / ROS2) — STT → MQTT → TTS 노드 동시 실행

- **대상 패키지**
  - `kids_stt_ros`: Jetson 마이크 입력 기반 STT 노드
  - `kids_ws_ros`: STT 결과를 MQTT로 송신 + 백엔드 응답을 MQTT로 수신하여 ROS 토픽으로 브릿지
  - `kids_google_tts_ros`: Google Cloud TTS로 음성 합성/재생 + speaking 상태 publish
- **동시 실행 런치**
  - `kids_ws_ros/launch/stt_mqtt_tts_launch.py` 실행 시 아래 4개 노드가 함께 실행됨
    - `kids_stt_ros/jetson_stt_node`
    - `kids_ws_ros/jetson_mqtt_bridge_node`
    - `kids_ws_ros/jetson_mqtt_response_node`
    - `kids_google_tts_ros/google_tts_node`

---

## 0. 포팅 시 주의사항

- **폴더명은 `exec`로 정확히 생성**해야 합니다.
- **소스코드는 추가 업로드하지 않아도 됩니다.**
- 본 구성은 **Jetson Nano에서 ROS2 기반으로 STT→MQTT→TTS 전체 파이프라인**을 구동하는 목적입니다.

---

# 1. Gitlab 소스 clone 이후 빌드 및 배포할 수 있도록 정리한 문서

## 1-1) 사용한 제품/설정/버전 정보(기재 템플릿)

아래는 **문서에 반드시 적어야 하는 항목**이며, 레포에서 확인 가능한 항목만 “확정”으로 채웠습니다.

- **OS**: Ubuntu (Jetson Nano 기본 환경 가정)
- **ROS2 배포판**: (예: `foxy` / `humble`) *(실제 사용 버전 기입 필요)*
- **Python 패키지(레포 확인 기반)**
  - `kids_stt_ros/requirements.txt`
    - `faster-whisper`
    - `ctranslate2>=4,<5`
    - `SpeechRecognition`
    - `openwakeword`
    - `onnxruntime`
  - `kids_ws_ros/requirements.txt`
    - `websockets>=11`
    - `paho-mqtt>=1.6`
  - `kids_google_tts_ros/setup.py` (install_requires)
    - `google-cloud-texttospeech`
    - `simpleaudio`
- **MQTT Broker**
  - 기본 설정: `127.0.0.1:1883` (Jetson 로컬 브로커 기준)

## 1-2) 빌드 시 사용되는 환경 변수(상세)

- 설정 파일에 `env_file` 항목이 존재하며, 환경에 따라 `.env`에 **EC2 주소(예: MQTT 브로커 호스트/백엔드 엔드포인트 등)** 를 넣어 운용할 수 있습니다.
- Google TTS 인증은 `.env`가 아니라 **Google TTS 서비스 계정 JSON**으로 관리합니다.

### `.env` 적용 우선순위

- 노드는 `env_file`을 읽어 `KEY=VALUE`를 환경변수로 로드한 뒤, **환경변수 값이 있으면 그 값을 우선 사용**합니다.
- 해당 키가 환경변수에 없으면, **ROS 파라미터(YAML 값)** 으로 fallback 합니다.

### `.env`에서 읽는 키(코드 기준)

`kids_ws_ros`의 MQTT 노드들이 실제로 조회하는 환경변수 키는 아래와 같습니다.

#### `jetson_mqtt_bridge_node`

- `DEVICE_ID`
- `MQTT_HOST`
- `MQTT_PORT`
- `MQTT_USERNAME` 또는 `MQTT_USER`
- `MQTT_PASSWORD` 또는 `MQTT_PASS`
- `MQTT_TOPIC_TEMPLATE`
- `MQTT_QOS`

#### `jetson_mqtt_response_node`

- `DEVICE_ID`
- `MQTT_HOST`
- `MQTT_PORT`
- `MQTT_USERNAME` 또는 `MQTT_USER`
- `MQTT_PASSWORD` 또는 `MQTT_PASS`
- `MQTT_RESPONSE_TOPIC_TEMPLATE`
- `MQTT_QOS`

### `.env` 예시(EC2 MQTT 브로커 사용)

```dotenv
DEVICE_ID=<device_id> # 테스트 환경에서는 'A304-DEV-0001' 고정

MQTT_HOST=<EC2_PUBLIC_IP_OR_DOMAIN>
MQTT_PORT=1883

MQTT_USERNAME=
MQTT_PASSWORD=

MQTT_QOS=1

MQTT_TOPIC_TEMPLATE=orbit/{device_id}/event/conversation
MQTT_RESPONSE_TOPIC_TEMPLATE=orbit/{device_id}/conversation
```

## 1-3) 배포 시 특이사항

- **STT 모델 경로가 Jetson 절대경로로 고정**
  - `kids_stt_ros/config/jetson_stt_mic.yaml`
    - `model_path: "/home/a304/ros2_ws/src/kids_stt_ros/models/whisper-base-komixv2-bin"`
- **Google TTS 자격 증명 경로가 Jetson 절대경로로 고정**
  - `kids_google_tts_ros/config/google_tts.yaml`
    - `credentials_path: "/home/a304/ros2_ws/src/kids_google_tts_ros/config/tts.json"`
- **device_id 정책**
  - 기기마다 `device_id`는 달라질 수 있습니다.
  - **테스트 환경에서는 고정값 사용이 맞습니다.** (예: `A304-DEV-0001`)
  - `kids_ws_ros/config/jetson_mqtt_bridge.yaml`는 기본값이 `A304-DEV-0001`로 설정되어 있습니다.
  - `kids_ws_ros/config/jetson_mqtt_response.yaml`의 `device_id`도 **테스트에서는 동일한 고정값으로 맞추는 것을 권장**합니다.

## 1-4) Jetson에서 실행 절차(권장 시나리오)

### (1) 워크스페이스 구성

- 예시 경로(설정과 일치시키는 것이 편함)
  - `/home/a304/ros2_ws/src/`
    - `kids_stt_ros/`
    - `kids_ws_ros/`
    - `kids_google_tts_ros/`

### (2) 소스 clone

- 각 레포를 `ros2_ws/src` 하위에 clone

### (3) Python 의존성 설치

- `kids_stt_ros`, `kids_ws_ros`: 각 패키지의 `requirements.txt` 설치
- `kids_google_tts_ros`: `setup.py`의 `install_requires` 설치

### (4) ROS2 빌드

- `colcon build`
- `source install/setup.bash`

### (5) MQTT 브로커 준비

- 설정 기본값이 `127.0.0.1:1883`이므로
  - Jetson 로컬에서 브로커가 실행 중이어야 함
  - 또는 설정 파일의 `mqtt_host`, `mqtt_port`를 외부 브로커로 변경

### (6) 실행 (동시 런치)

- `kids_ws_ros/launch/stt_mqtt_tts_launch.py`

이 런치 파일이 로드하는 config:

- STT: `kids_stt_ros/config/jetson_stt_mic.yaml`
- MQTT Bridge: `kids_ws_ros/config/jetson_mqtt_bridge.yaml`
- MQTT Response: `kids_ws_ros/config/jetson_mqtt_response.yaml`
- TTS: `kids_google_tts_ros/config/google_tts.yaml`

---

# 2. 프로젝트에서 사용하는 외부 서비스 정보를 정리한 문서

## 2-1) Google Cloud Text-to-Speech

- **사용 위치**: `kids_google_tts_ros`
- **필요 항목**
  - GCP 프로젝트
  - 서비스 계정(Service Account)
  - 서비스 계정 키(JSON)
- **키 파일 경로(설정값)**
  - `kids_google_tts_ros/config/google_tts.yaml`
    - `credentials_path: "/home/a304/ros2_ws/src/kids_google_tts_ros/config/tts.json"`

## 2-2) MQTT Broker

- **기본 설정**
  - `mqtt_host: 127.0.0.1`
  - `mqtt_port: 1883`
- **사용 목적**
  - STT 결과를 백엔드로 전달
  - 백엔드 응답 텍스트를 Jetson으로 수신

---

# 3. DB 덤프 파일 최신본

- 본 구성(STT–MQTT–TTS 노드) 기준으로는 **DB 덤프/ERD 파일을 사용하지 않습니다.**
- 백엔드가 DB를 사용하는 경우, 백엔드 레포에서 DB dump/마이그레이션 경로를 별도 첨부하세요.

---

# 4. 시연 시나리오

## 4-1) 시연 준비 체크리스트

- **STT 모델 파일 존재**
  - `/home/a304/ros2_ws/src/kids_stt_ros/models/whisper-base-komixv2-bin`
- **Google TTS credentials 존재**
  - `/home/a304/ros2_ws/src/kids_google_tts_ros/config/tts.json`
- **MQTT 브로커 접근 가능**
  - 기본: Jetson 로컬 `127.0.0.1:1883`
- **device_id(테스트 환경 고정값) 일치**
  - MQTT publish/subscribe 토픽 템플릿에 `device_id`가 들어가므로 브릿지/응답 노드에서 동일하게 맞추는 것을 권장

## 4-2) 시연 흐름(대화 1회 기준)

1. 런치 실행: `stt_mqtt_tts_launch.py`로 4개 노드 동시 실행
2. 사용자가 마이크에 말함
3. STT 노드가 인식 텍스트를 ROS 토픽으로 publish
   - `/dialog/user_text` (`std_msgs/String`)
4. MQTT bridge 노드가 `/dialog/user_text`를 subscribe하여 MQTT로 publish
   - publish 토픽: `orbit/{device_id}/event/conversation`
   - TTS speaking 중에는 전달 차단(`gate_while_tts_speaking: true`)
5. 백엔드가 응답을 MQTT로 publish
6. MQTT response 노드가 응답 MQTT를 subscribe 후 ROS 토픽으로 publish
   - `/dialog/ai_text`
7. TTS 노드가 `/dialog/ai_text`를 받아 음성 합성 후 재생
8. TTS 노드가 speaking 상태를 publish
   - `/dialog/is_speaking` (`std_msgs/Bool`)

---

## 부록) 토픽/브릿지 핵심 정리

### ROS 토픽

- `/dialog/user_text`
  - 발행: `kids_stt_ros/jetson_stt_node`
  - 구독: `kids_ws_ros/jetson_mqtt_bridge_node`
- `/dialog/ai_text`
  - 발행: `kids_ws_ros/jetson_mqtt_response_node`
  - 구독: `kids_google_tts_ros/google_tts_node`
- `/dialog/is_speaking`
  - 발행: `kids_google_tts_ros/google_tts_node`

### MQTT 토픽

- 대화 송신: `orbit/{device_id}/event/conversation`
- 응답 수신: `orbit/{device_id}/conversation`
