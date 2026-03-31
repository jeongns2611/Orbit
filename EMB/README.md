## 📦 EMB (Embedded System)
> 본 디렉토리는 유아 케어 로봇 프로젝트의 임베디드 시스템 코드를 관리합니다.  
Jetson(센서/AI) → RPi(의사결정) → STM32(구동 제어) 파이프라인으로 구성된 분산 제어 구조입니다.

## 📁 디렉토리 구조
```
EMB/
├── rpi/        # Raspberry Pi (상위 제어, 센서 수신, STM 통신, Jetson 통신)
│   ├── comm/       # STM UART 통신
│   ├── common/     # protocol, types
│   ├── control/    # 주행 상태 정책
│   ├── planner/    # speed / steer planner
│   ├── sensor/     # MQTT / Dummy sensor
│   ├── status/     # 상태 퍼블리셔
│   ├── main.cpp
│   └── CMakeLists.txt
│
├── stm/        # STM32F401RE (모터, 서보, Fail-safe)
│   ├── Core/
│   ├── Drivers/
│   ├── stm32_f401re_actuator_control.ioc
│   ├── STM32F401RETX_FLASH.ld
│   └── STM32F401RETX_RAM.ld
│
└── README.md
```

## 🔌 시스템 구성
```
[ Jetson (센서/AI) ]
        │ (MQTT)
        ▼
[ RPi5 ]  ─── UART ───>  [ STM32F401RE ]
  - 타겟 계산              - 모터 제어
  - 속도/조향 생성         - 서보 제어
  - 상태 브로커 송신       - 범퍼 Fail-safe
```


## 🧠 역할 분담
### 1️⃣ Jetson Orin Nano (EMB/jetson)
| 항목 | 설명 |
|------|------|
| 객체 인식 | YOLOv8 기반 실시간 Object Detection |
| 다중 객체 추적 | Multi-Object Tracking (MOT) |
| Re-ID | Color Histogram 기반 재식별 |
| 거리 추정 | LiDAR + Camera Sensor Fusion |
| 데이터 송신 | MQTT(JSON)로 타겟 감지 여부 / 거리 / 각도 송신 |
| 추론 가속 | TensorRT (FP16) |

### 2️⃣ Raspberry Pi (EMB/rpi)

| 항목 | 설명 |
|------|------|
| 센서 수신 | MQTT (rpi/fusion/target) |
| 속도 계산 | TargetSpeedPlanner |
| 조향 계산 | TargetSteerPlanner |
| STM 통신 | UART (SPD, STR, STAT, EVT) |
| 상태 송신 | MQTT Status Publisher |

### 3️⃣ STM32F401RE (EMB/stm)

| 항목 | 설명 |
|------|------|
| 모터 제어 | DC Motor PWM |
| 조향 제어 | 서보모터 PWM |
| Fail-safe | 범퍼 스위치 입력 |
| UART 수신 | SPD / STR 수신 |
| UART 송신 | 상태 / 이벤트 송신 |


## 🚀 Jetson – Key Features

### 1️⃣ Advanced Perception & Re-ID

- YOLOv8 기반 실시간 객체 감지
- Multi-Object Tracking (MOT)
- Color Histogram 기반 Re-ID
- Occlusion 상황에서도 안정적인 추적
- TensorRT FP16 최적화

### 2️⃣ Sensor Fusion (LiDAR + Camera)

- LiDAR 거리 + Camera 시각 정보 결합
- 3D 공간 인지
- 아이 및 장애물과의 실제 거리 추정

### 3️⃣ Edge Computing & Communication

- ROS2 Humble 기반 분산 노드 구조
- MQTT 기반 실시간 상태/이벤트 송신

## 🔁 데이터 파이프라인 (End-to-End Flow)

1. **Jetson**
    - Camera + LiDAR 입력 수집
    - YOLOv8 객체 인식
    - Tracking + Re-ID
    - 거리/각도 추정 (Sensor Fusion)
    - MQTT(JSON)로 RPi에 송신
2. **RPi**
    - `SensorMQTT`가 MQTT payload 수신
    - JSON → `SensorData` 구조체 변환
    - Planner가 추종 정책 계산
        - `TargetSpeedPlanner`
        - `TargetSteerPlanner`
    - UART로 STM에 목표 속도/조향각 전송
3. **STM32**
    - UART 수신
    - DC 모터 / 서보모터 PWM 제어
    - 범퍼 스위치 기반 Fail-safe
    - 상태/이벤트 UART 송신


## 📌 UART 프로토콜 요약

```
SPD:<float>\n            # 목표 속도 (m/s)  
STR:<float>\n            # 목표 조향각 (rad)
STAT:NORMAL/EMERGENCY\n  # 현재 STM 상태  
EVT:NONE/BUMP\n          # 발생한 이벤트  
```

> 상세 규격: `EMB/rpi/common/protocol.hpp` 참고
>

## 🛠️ 빌드 & 실행 방법

### ▶ RPi (Ubuntu 24.04)

```bash
cd EMB/rpimkdir -p buildcd build
cmake ..
make -j
./rpi_main# 실행 바이너리 (이름은 CMake 설정에 따라 다를 수 있음)
```


### ▶ STM32 (STM32CubeIDE)

1. STM32CubeIDE 실행
2. `EMB/stm/stm32_f401re_actuator_control.ioc` 열기
3. Code Generate
4. 빌드 & Flash
5. UART, PWM 핀 설정 확인

## 🚨 Fail-safe (범퍼 스위치)

- GPIO: `PB12`
- 눌림: `0`
- 동작:
    - 즉시 모터 정지
    - STM → RPi로 EMERGENCY 상태 송신

## ⚠️ 주의 사항

- RPi ↔ STM UART Baudrate: **115200**
- GND 공통 필수
- STM 전원은 **L298N 5V 라인 사용 금지**
- 경로 변경 시 CMake / include 경로 수정 필요

## 🛠 Tech Stack

| Category | Technologies |
| --- | --- |
| Hardware | Jetson Orin Nano, RPLiDAR, USB Camera |
| OS / Env | Ubuntu 22.04, ROS2 Humble, Docker |
| AI / CV | YOLOv8, OpenCV, TensorRT, ONNX |
| Language | Python, C++ |
| Messaging | MQTT |
| MCU | STM32F401RE |

## 👨‍💻 Maintainer

- **RPi, STM** : 김병우  
- **Jetson** : 장유진  

문의 : Slack / GitLab MR 코멘트