# 🧩 BE / AI Python 코드 컨벤션

본 문서는 Backend / AI 서버 개발 시 사용하는 **Python 코드 컨벤션**을 정의합니다.  
가독성, 일관성, 유지보수성을 최우선으로 합니다.

---

## 1. 기본 원칙

- 자동 포맷터: **Black**
- 들여쓰기: **공백 4칸**
- 최대 줄 길이: **79자 내외**
- 불필요한 공백 금지
- Python 타입 힌트는 **강제가 아님** (권장 사항)

---

## 2. 네이밍 규칙

### 2.1 기본 규칙

- `snake_case` : 변수, 함수, 메서드, 모듈명
- `PascalCase` : 클래스, 예외(Exception)
- `UPPER_SNAKE_CASE` : 상수(Constant)

### 2.2 네이밍 표

| 항목 | 스타일 | 예시 |
|---|---|---|
| 변수 | snake_case | `user_count`, `is_active` |
| 메서드 | snake_case | `get_user()`, `calculate_total()` |
| 클래스 | PascalCase | `UserAuth`, `ImageProcessor` |
| 예외 | PascalCase + Error | `UserNotFoundError` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY` |
| 모듈 | snake_case | `models.py` |
| 패키지 | snake_case | `user_auth` |
| 테스트 파일 | `test_` prefix | `test_api.py` |
| 설정 / 문서 | kebab-case | `docker-compose.yml`, `README.md` |

---

## 3. 언더스코어(`_`) 사용 규칙

- `_var` : 내부 사용 변수
- `var_` : Python 예약어 충돌 회피
- `__var` : 네임 맹글링 (상속 충돌 방지)
- `__var__` : 매직 메서드 (특수 용도)

---

## 4. 코드 레이아웃 & 포맷팅

### 4.1 빈 줄 규칙

- 최상위 클래스 / 함수 사이: **2줄**
- 클래스 내부 메서드 사이: **1줄**

### 4.2 공백 규칙

- 괄호 내부 공백 ❌
- 쉼표(`,`) / 콜론(`:`) 앞 공백 ❌

```python
temp = [[]]          # good
if temp:             # good
temp = ["a", "b"]    # good
```

---

## 5. Import 규칙

- Import 순서
  1. 표준 라이브러리
  2. 서드파티 라이브러리
  3. 로컬 프로젝트
- 그룹 사이 **빈 줄 필수**
- **isort 사용 권장**

---

## 6. 타입 힌트 & `typing` 사용

- 모든 함수 / 메서드에 타입 힌트 작성
- 반환 타입까지 명확히 명시

```python
def create_user(name: str, age: int) -> None:
    ...
```

- `typing` 모듈 적극 활용

```python
from typing import Tuple

user: Tuple[int, str, bool]
```

> ⚠️ 타입 힌트는 런타임 강제가 아닌 **정적 분석 및 가독성 목적**

---

## 7. 조건문 & 비교 규칙 (Pythonic Rules)

### 7.1 `None` / Boolean

- `None` 비교: `is`, `is not`
- Boolean 비교: `==`, `is True` ❌

```python
if value is None:
    ...

if is_active:
    ...
```

### 7.2 빈 시퀀스

- 빈 문자열 / 리스트 / 튜플은 조건문에서 `False`

```python
if items:
    ...
```

### 7.3 타입 비교

- `isinstance()` 사용
- `type()` 직접 비교 ❌

---

## 8. 문자열 & 객체 처리

- `string` 모듈 ❌ → **문자열 메서드 사용**
- 접두 / 접미 검사:
  - `startswith()`
  - `endswith()`

---

## 9. 함수 & 메서드 규칙

### 9.1 인자 규칙

- 키워드 인자 기본값은 `=` 붙여쓰기

```python
def func(arg1=None, arg2=10):
    ...
```

### 9.2 메서드 타입

- 인스턴스 메서드: `self`
- 클래스 메서드: `cls`
- 정적 메서드: `@staticmethod`

---

## 10. 주석 & Docstring

- 모든 **모듈 / 클래스 / 함수 / 메서드**에 Docstring 작성
- **Google Style Docstring 사용**

---

## 11. 예외 처리 (FastAPI Backend)

### 11.1 커스텀 예외 정의

- 도메인 의미 중심
- 예외 클래스명은 반드시 `Error` 접미사 사용

```python
class BusinessError(Exception):
    ...
```

### 11.2 전역 예외 핸들러

- 에러 응답 포맷 통일
- HTTP 상태 코드 명확히 지정

---

## 12. 서버 개발 규칙 (Backend)

- Pydantic Schema로 API 입출력 검증
- I/O Bound 작업은 `async / await` 사용
- 전역 예외 처리 필수

---

## 13. 참고 자료

- [PEP 8 – Style Guide for Python Code](https://icedhotchoco.tistory.com/entry/PEP-8)
- [PEP 20 – The Zen of Python](https://icedhotchoco.tistory.com/entry/PEP-20)
