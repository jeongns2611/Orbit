## 📱 FE (Frontend)
> 본 디렉토리는 유아 케어 로봇 프로젝트의 보호자용 모바일/웹 클라이언트를 관리합니다.  
Expo 기반 React Native로 구현된 크로스 플랫폼 앱으로, 실시간 디바이스 모니터링 및 일일 리포트 제공 기능을 제공합니다.

## 📁 디렉토리 구조
```
FE/
├── App.tsx                # 앱 엔트리포인트 (웹 428px 제한)
├── index.ts
├── app.json               # Expo 설정
├── eas.json               # EAS Build 설정
├── package.json
├── tsconfig.json
└── src/
    ├── assets/            # 폰트, 이미지 리소스
    ├── components/        # 공통 컴포넌트
    │   ├── common/        # Button, Text, ScreenHeader
    │   └── layout/        # Container, SafeArea 레이아웃
    ├── config/            # 환경 설정
    │   └── env.ts         # API Base URL
    ├── constants/         # 색상, 폰트, 라우트 상수
    ├── hooks/             # Custom Hooks
    │   └── useDeviceStatusSSE.ts  # SSE 연결
    ├── navigation/        # React Navigation
    │   └── stacks/
    ├── screens/           # 화면 컴포넌트
    │   ├── auth/          # 로그인/회원가입
    │   ├── home/          # 홈 (타임라인, 상태)
    │   ├── registration/  # 디바이스/아이 등록
    │   ├── report/        # 일일 리포트
    │   └── settings/      # 설정/마이페이지
    ├── services/          # API & SSE
    │   ├── api/           # REST API 클라이언트
    │   └── sse/           # SSE 스트림 처리
    ├── store/             # Zustand 상태 관리
    │   ├── authStore.ts
    │   ├── registrationStore.ts
    │   ├── sseStore.ts
    │   └── themeStore.ts
    └── utils/             # 유틸리티
        ├── reportParser.ts
        ├── styles/
        └── validation/
```

## 🔌 시스템 구성
```
[ Mobile/Web Client ]
        │ (HTTP/SSE)
        ▼
[ Backend API Server ]
  - 인증 (JWT)
  - 디바이스 등록
  - 리포트 생성
  - 실시간 상태 스트림
```

## 🎯 주요 기능

### 1️⃣ 인증 및 회원 관리
| 항목 | 설명 |
|------|------|
| 로그인/회원가입 | 이메일 + 비밀번호 인증 |
| 토큰 관리 | JWT Access/Refresh Token (AsyncStorage) |
| 자동 갱신 | 만료 임박 시 자동 Refresh |
| 보안 | Bearer 토큰 기반 API 인증 |

### 2️⃣ 디바이스 & 아이 등록
| 항목 | 설명 |
|------|------|
| 디바이스 등록 | 시리얼 번호 기반 기기 등록 |
| 아이 프로필 | 이름, 생년월일, 성별, 메모 관리 |
| 상태 관리 | Zustand Store로 등록 상태 추적 |
| 유효성 검사 | react-hook-form + yup |

### 3️⃣ 실시간 모니터링 (SSE)
| 항목 | 설명 |
|------|------|
| 디바이스 상태 | `TRACKING` / `HOLD_DECAY` / `STOP` |
| 타임라인 이미지 | 이벤트 발생 시각 + 설명 텍스트 |
| 자동 재연결 | 401 에러 시 토큰 갱신 후 재연결 |
| EventSource | react-native-sse 라이브러리 |

### 4️⃣ 일일 리포트
| 항목 | 설명 |
|------|------|
| 리포트 조회 | 날짜별 일일 활동 리포트 |
| 리포트 생성 | AI 기반 리포트 생성 요청 |
| 최신 이미지 | 해당일 마지막 캡처 이미지 조회 |
| 텍스트 파싱 | 구조화된 리포트 렌더링 |

## 🚀 기술 스택

### Core
| Category | Technologies |
|----------|-------------|
| Framework | React Native, Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation (Stack, Bottom Tabs) |
| State | Zustand + AsyncStorage |

### UI/UX
| Category | Technologies |
|----------|-------------|
| Styling | StyleSheet, LinearGradient |
| Fonts | Pretendard, Nanum Pen Script, GangwonEduSaeeum |
| Layout | Safe Area Context, Responsive Hooks |
| Max Width | 428px (웹 모드) |

### Data & Communication
| Category | Technologies |
|----------|-------------|
| HTTP Client | Fetch API + Custom Wrapper |
| SSE | react-native-sse (EventSource) |
| Form | react-hook-form + yup |
| Date | date-fns |

## 🔁 데이터 파이프라인

### 앱 부팅 플로우
```
1. 스플래시 표시
2. 폰트 로드 (Pretendard, 손글씨체, GangwonEduSaeeum)
3. 웹 환경 → CDN woff 추가 로드
4. Zustand Store 하이드레이션 (AsyncStorage)
5. 스플래시 종료 (최대 6초 타임아웃)
6. 인증 상태 확인
   ├─ 로그인 완료 → MainTabs
   └─ 미로그인 → LoginScreen
```

### SSE 실시간 연결
```
1. 로그인 & 디바이스 등록 완료 확인
2. SSE 연결 (/api/v1/app/sse)
   ├─ Authorization: Bearer {accessToken}
   └─ 401 에러 → refresh 후 재연결
3. 이벤트 수신
   ├─ DEVICE_STATUS → drive_state 업데이트
   └─ IMAGE → 타임라인 이벤트 추가
4. 자동 재연결 로직 (네트워크 끊김 대응)
```

### 리포트 생성 플로우
```
1. 날짜 선택
2. GET /api/v1/app/reports?date=YYYY-MM-DD
   ├─ 200 OK → 기존 리포트 표시
   └─ 404 Not Found → "생성" 버튼 표시
3. POST /api/v1/app/reports (리포트 생성 요청)
4. report_text 파싱 및 렌더링
```

## 📌 API 엔드포인트 요약

### 인증
```
POST /api/v1/auth/login           # 로그인
POST /api/v1/auth/register        # 회원가입
POST /api/v1/auth/refresh         # 토큰 갱신
POST /api/v1/auth/logout          # 로그아웃
```

### 디바이스 & 아이
```
POST /api/v1/app/devices          # 디바이스 등록
GET  /api/v1/app/children         # 아이 프로필 조회
POST /api/v1/app/children         # 아이 프로필 생성
PATCH /api/v1/app/children/{id}   # 아이 프로필 수정
```

### 리포트 & 이미지
```
GET  /api/v1/app/reports?date=YYYY-MM-DD  # 리포트 조회
POST /api/v1/app/reports                  # 리포트 생성
GET  /api/v1/app/latest-image?date=...    # 최신 이미지
```

### SSE
```
GET /api/v1/app/sse               # SSE 스트림 연결
  - Authorization: Bearer {token}
  - Events: DEVICE_STATUS, IMAGE
```

## 🛠️ 빌드 & 실행 방법

### ▶ 개발 모드
```bash
cd FE
npm install

# 로컬 개발
npm start
# 또는
expo start

# 터널 모드 (외부 접속)
expo start --tunnel

# 웹 모드
expo start --web
```

### ▶ 환경 변수 설정
```bash
# .env 파일 생성
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com
# 또는 로컬 개발 시
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

### ▶ EAS Build (배포)
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios

# 모두
eas build --platform all
```

## 🎨 디자인 시스템

### 웹 모드 제약
- 최대 너비: **428px**
- 중앙 정렬 레이아웃
- 반응형 폰트 크기

### 폰트 전략
| 환경 | Pretendard | GangwonEduSaeeum | Nanum Pen Script |
|------|-----------|------------------|------------------|
| Native | OTF/TTF | TTF | TTF |
| Web | OTF | CDN woff | CDN woff |

### 테마
- 라이트/다크 모드 지원
- `themeStore`로 상태 관리
- AsyncStorage 영속화

## 🚨 주요 이슈 해결

### OTS Parsing Error (웹)
- **문제**: 웹에서 TTF/OTF 폰트 로드 시 OTS 에러
- **해결**: GangwonEduSaeeum을 CDN woff로 전환
- **위치**: `App.tsx` 폰트 로딩 로직

### SSE 재연결
- **문제**: 네트워크 끊김 또는 401 에러
- **해결**: `useDeviceStatusSSE` 훅에서 자동 재연결
- **로직**: 401 → refresh → 새 토큰으로 재연결

### 토큰 만료 처리
- **문제**: API 호출 중 토큰 만료
- **해결**: `apiRequest` 래퍼에서 401 감지 → refresh 시도
- **폴백**: refresh 실패 시 로그아웃 처리

## ⚠️ 주의 사항

- **AsyncStorage 한계**: 민감 데이터는 SecureStore 고려
- **SSE 연결**: 장시간 유지 시 배터리 소모 주의
- **웹 환경**: 폰트 CDN 의존성 (오프라인 불가)
- **토큰 보안**: 절대 콘솔/로그에 노출 금지
- **최대 너비**: 웹 레이아웃은 428px 고정

## 📚 리소스 출처

### 폰트
- **Pretendard**: [GitHub](https://github.com/orioncactus/pretendard)
- **Nanum Pen Script**: [네이버 한글한글 아름답게](https://hangeul.naver.com/fonts/search?f=nanum)
- **GangwonEduSaeeum**: [강원도교육청](https://www.gwe.go.kr/main/content.do?key=m2307211207715)

### 아이콘 & 이미지
- `assets/logo.png`, `cloud.png`, `rocket.png` 등
- 자체 제작 또는 오픈 소스 리소스
