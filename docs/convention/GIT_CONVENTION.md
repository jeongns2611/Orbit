# 🧾 Git & Branch & Jira 컨벤션

본 문서는 **팀 협업을 위한 Git 커밋, 브랜치 전략, Jira 이슈 관리 규칙**을 정의합니다.

---

## 1. 커밋 컨벤션

### 1.1 커밋 메시지 템플릿

```
type(scope): description
- body
```

### 작성 예시

**본문 포함**

```
feat(user): 사용자 프로필 페이지 추가
- 사용자 프로필 페이지 및 라우팅 구현
- 프로필 카드 컴포넌트 구현
- 프로필 수정 기능 구현
```

**본문 생략**

```
fix(order): 결제 금액 계산 오류 수정
refactor(user): 마이페이지 로직 최적화
```

---

### 1.2 Commit Type

| 타입 | 설명 |
|---|---|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| refactor | 프로덕션 코드 리팩토링 |
| test | 테스트 코드 추가/수정 |
| update | 기능 개선 |
| style | 포맷 수정 (로직 변경 없음) |
| design | UI/CSS 변경 |
| hotfix | 긴급 버그 수정 |
| comment | 주석 추가/수정 |
| rename | 파일/폴더명 변경 |
| remove | 파일 삭제 |
| chore | 빌드/환경 설정 |
| docs | 문서 수정 |
| settings | 환경 설정 |

---

## 2. 브랜치 전략

### 2.1 Git Flow

- `feature → develop → release → hotfix → master`
- `master`: 배포용
- `hotfix`: 운영 중 긴급 수정
- `release`: 통합 테스트
- `develop`: 개발 통합
- `feature`: 기능 개발
> ❗ **모든 merge는 GitLab UI에서 수행**

---

### 2.2 브랜치 명명 규칙
**템플릿**

```
type/feature-name/issue-key
```

**작성 예시**

- `feature/login/S14P11A302-28`
- `fix/header-icon/S14P11A302-28`
- `refactor/api-call/S14P11A302-28`

---

### 2.3 브랜치 생성 및 병합 흐름

1. `develop` 기준으로 feature 브랜치 생성
2. 기능 개발 및 커밋
3. 원격 push
4. Pull Request 생성
5. 코드 리뷰 (최소 2명)
6. 승인 후 merge

---

### 2.4 Pull Request 규칙

- 제목: 구현 기능 요약
- 본문: 변경 사항 / 테스트 여부
- 테스트: 로컬 빌드 및 API 테스트 여부 명시

---

# 3. 코드 리뷰 규칙

- 리뷰 기준: 가독성, 유지보수성, 안정성
- 최소 **2명 이상 승인 필수**
- 피드백 반영 후 재요청

---

# 4. Jira 컨벤션

### 4.1 사용할 이슈 유형

- Epic
- Task

### 4.2 이슈명 템플릿

| 유형 | 규칙 |
|---|---|
| Epic | `[기능명] 큰 단위 목표` |
| Task | `구체적인 작업 내용 (동사형)` |

### 4.3 컴포넌트 사용

- `BE`, `FE`, `EMB`, `AI`, `INF`

---

### 4.4 작성 예시

**Epic: [회원] 사용자 인증 및 관리**

- Task: 회원가입/로그인 API 개발
- Task: 로그인 화면 UI 구현

**Epic: [제어] 유모차 하드웨어 제어**

- Task: 모터 제어 로직 작성
- Task: 자이로 센서 데이터 수집

---

### 4.5 이슈 생성 절차

1. Epic 생성
2. Task 생성 및 Epic 연결
3. 컴포넌트 지정
4. 브랜치 생성

**브랜치 생성 GIT 명령어 예시**

```bash
git checkout -b feature/signup-api/S14P11A304-28
```

---

## 5. 체크리스트

- [ ] 커밋 메시지가 컨벤션을 따르는가?
- [ ] 브랜치명이 규칙에 맞는가?
- [ ] PR에 테스트 여부를 명시했는가?
- [ ] Jira Task가 Epic에 연결되었는가?
