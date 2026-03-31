# 🪐 Orbit (오르빗) – 아이의 궤도를 함께하는 AI 홈 케어 파트너

## 서비스 한 줄 소개
**아이의 궤도를 함께하는 AI 홈 케어 파트너, Orbit**

>자율주행 로봇이 아이를 따라다니며 교감하고, 아이의 하루를 분석하여 부모에게 '성장 리포트'를 전달하는 홈 AIoT 서비스입니다.

## 🏢 팀 소개

| 역할 | 담당자 |
|----|----|
| HW | 김병우(팀장), 장유진 |
| AI | 권대일, 장유진 |
| FE | 안수연, 문현아 |
| BE | 윤정아, 문현아 |
| Infra | 윤정아 |

---

## 📜 팀 규칙 & 컨벤션

> 팀 협업을 위한 규칙과 컨벤션은 아래 문서를 따릅니다.

- 📄 [Git 브랜치 & 커밋 메시지 규칙](./docs/convention/GIT_CONVENTION.md)
- 📄 [EMB 코드 컨벤션](./docs/convention/EMB_CONVENTION.md)
- 📄 [BE / AI Python 코드 컨벤션](./docs/convention/BE_AI_PYTHON_CONVENTION.md)
- 📄 [Frontend 코드 컨벤션](./docs/convention/FE_CONVENTION.md)

## ⚙️ 개발 산출물

- 📄 [기능 목록](./docs/deliverables/기능목록_A304.pdf)
- 📄 [ERD](./docs/deliverables/ERD_A304.png)
- 📄 [와이어 프레임](./docs/deliverables/와이어%20프레임_A304.zip)
- 📄 [화면정의서](./docs/deliverables/화면정의서_A304.pdf)
- 📄 [시퀀스 다이어그램](./docs/deliverables/시퀀스%20다이어그램_A304.zip)


---

## 서비스 개요

> "맞벌이 부부의 '돌봄 공백'과 '정서적 단절'을 기술로 메우다."

현대 사회의 맞벌이 가정에서 아이가 하원 후 부모가 귀가하기 전까지 발생하는 3~4시간의 공백은 단순한 물리적 부재를 넘어, 아이의 정서적 불안과 미디어 과의존(유튜브 등)을 야기합니다. 기존의 홈캠은 '감시'에 그치고, 단순 장난감 로봇은 '섬세한 소통'이 부족합니다.

Orbit은 이 문제를 해결하기 위해 탄생했습니다.

- Safety: 아이가 있는 곳으로 로봇이 이동하여 사각지대 없는 케어를 제공합니다.

- Interaction: 아이의 눈높이에서 대화하며 수동적 미디어 노출을 능동적 상호작용으로 전환합니다.

- Connection: 하루 동안 쌓인 데이터를 AI가 분석하여, 부모에게 단순 기록이 아닌 '인사이트(감정, 발달, 활동 요약)'를 제공합니다.
---

## 주요 기능

### 🚀 아이 트래킹 주행 (Child Following)
- 자율 주행 팔로잉: 고정된 홈캠의 한계를 넘어, 로봇이 아이를 인식(Vision)하고 일정한 안전 거리를 유지하며 따라다닙니다.

- 능동적 시야 확보: 아이가 이동하면 로봇도 함께 이동하여, 부모는 언제든 아이의 상태를 사각지대 없이 확인할 수 있습니다.

### 💬 로봇과의 실시간 소통 (Interactive AI Communication)
- 눈높이 대화 친구: "왜 하늘은 파래?"와 같은 아이의 끊임없는 질문에 LLM 기반의 AI가 아이의 연령대(2~4세)에 맞춰 친절하게 대답합니다.

- 정서적 케어: 아이가 울거나 웃는 상황을 인식하여, 적절한 반응(위로의 말, 신나는 노래 재생 등)을 통해 정서적 안정을 돕습니다.

### 📝 아이의 하루 요약 리포트 (Daily Growth Report)
- 감정/행동 분석: 하루 동안 아이가 느꼈던 주요 감정(즐거움, 호기심, 짜증 등)과 활동 내용을 타임라인별로 분석합니다.

- 자동 육아 일기: "오늘 지우는 '중력'이라는 단어를 배웠어요."와 같이 아이의 발달 사항과 특이점을 요약하여 부모에게 리포트 형태로 전송합니다.

---

## 프로젝트 특장점 (기능 관점)

### 브릿지 케어 (Bridge Care):
- 하원 후 부모 귀가 전까지의 취약 시간대를 로봇이 채워주어 부모의 죄책감과 불안감을 해소합니다.

### 디지털 튜터 (Smart Tutor):
- 유튜브를 보며 혼자 방치되는 대신, 로봇과의 쌍방향 대화를 통해 언어 능력과 창의력을 자극합니다.

### 자동 아카이빙 (Auto Archiving):
- 부모가 직접 기록하기 힘든 아이의 자연스러운 일상 모습(사진, 대화 내용)을 AI가 자동으로 선별하고 기록하여 소중한 추억을 남겨줍니다.

---

## 프로젝트 차별점 (기술 관점)

기존의 홈캠(CCTV) 및 단순 펫 로봇과의 기술적 차별성은 다음과 같습니다.

| 구분 | 일반 홈캠 / 펫 로봇 | Orbit (오르빗) |
| :--- | :--- | :--- |
| **시야** | 고정형 (사각지대 존재) | **이동형** (YOLOv8 기반 객체 추적 및 트래킹 주행) |
| **소통** | 일방적 명령 수행 또는 무반응 | **양방향 소통** (STT/TTS + LLM을 활용한 문맥 파악 대화) |
| **데이터** | 단순 영상 저장 (Raw Data) | **가공된 정보** (Vision+Language 모델을 결합한 멀티모달 리포트 생성) |

---

## AI 활용 
Orbit은 Vision AI와 Generative AI를 결합하여 아이를 이해합니다.

### 1. Computer Vision (눈)

- YOLOv8: 실시간으로 아이를 탐지하고 위치를 추적하여 로봇의 주행 경로를 생성합니다.

### 2. Voice AI (귀와 입)

- Whisper (OpenAI): 아이의 불분명한 발음도 정확하게 텍스트로 변환(STT)합니다.

- VITS (TTS): 친근하고 자연스러운 목소리로 아이에게 대답하고 동화책을 읽어줍니다.

### 3. LLM (두뇌)

- Image Captioning을 통해서 아이의 행동과 상황을 파악합니다.

- Generative AI (Gemini/GPT): 아이와의 대화 맥락을 유지하며 교육적이고 정서적인 답변을 생성합니다. 또한, 수집된 로그(대화, 행동, 감정)를 바탕으로 부모를 위한 '**일일 리포트**'를 작성합니다.

---

## 기술 스택

### Frontend / Mobile
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State**: Zustand
- **Styling**: StyleSheet

### AI
- Python 3.10  
- PyTorch, ONNX, TFLite  
- OpenCV, NumPy, Librosa

### Backend
- Python 3.10
- FastAPI  

### Database
- PostgreSQL 16.11

### Hardware
- Python 3.10, C++  
- Linux, Ubuntu 22.04, ROS2 Humble
- NVIDIA Jetson, Raspberry Pi, STM32

### Infrastructure
- AWS EC2
- AWS S3
- Docker
- Jenkins
- Nginx


