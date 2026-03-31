# 📘 C/C++ 코드 컨벤션 (Google Style + clang-format)

본 문서는 **임베디드 / AIoT 환경**에서 사용하는 C/C++ 코드 컨벤션을 정의합니다.  
Google C++ Style Guide를 기반으로 하며, clang-format 자동화를 전제로 합니다.

---

## 1. 네이밍 규칙

### 기본 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일명 | `snake_case` | `motor_controller.cpp`, `imu_filter.h` |
| 클래스 / 구조체 / enum | `PascalCase` | `MotorController`, `ImuData`, `DeviceState` |
| 함수 (일반) | `PascalCase` | `ComputeHeight()`, `InitDevice()` |
| 함수 (accessor/mutator) | `snake_case` 허용 | `size()`, `set_speed()` |
| 변수 / 파라미터 | `snake_case` | `target_speed`, `retry_count` |
| 클래스 멤버 변수 | `snake_case_` | `target_speed_`, `imu_buffer_` |
| 상수 (const/constexpr) | `kMixedCase` | `kMaxRetry`, `kDefaultBaudRate` |
| 매크로 | `UPPER_SNAKE_CASE` | `LOG_TAG`, `CHECK_OK` |
| namespace | `snake_case` | `sensor_fusion`, `device_io` |
| 전역 변수 | 지양 | `g_device_state` (불가피할 경우) |

- 일반 함수: 초기화 / 계산 / 처리 등 **동작 중심**
- accessor / mutator: 멤버 변수 접근만 수행

---

## 2. 네이밍 예시

```cpp
// constants
constexpr int kMaxRetry = 3;

// class
class MotorController {
 public:
  void InitDevice();
  void SetSpeed(int target_speed);

 private:
  int target_speed_;  // member variable ends with '_'
};
```

---

## 3. 파일 및 폴더 구조

### 권장 구조

```
project/
├── src/            # 구현 (.cpp)
│   ├── main.cpp
│   ├── device/
│   └── control/
│
├── include/        # 헤더 (.h)
│   ├── device/
│   └── control/
│
├── tests/          # 테스트 (선택)
├── scripts/        # 실행 스크립트
├── .clang-format   # 포맷 규칙
└── .vscode/        # VSCode 설정
```

---

## 4. include 순서

- 헤더 파일은 **단독 include 시 컴파일 가능**해야 함

```cpp
// 1) 해당 파일의 헤더
#include "control/motor_controller.h"

// 2) C 시스템 헤더
#include <stdint.h>

// 3) C++ 표준 라이브러리
#include <vector>
#include <string>

// 4) 외부 라이브러리
#include <opencv2/core.hpp>

// 5) 프로젝트 내부 헤더
#include "device/uart.h"
#include "utils/logging.h"
```

---

## 5. 코드 구조 (C++)

### 작성 순서

1. include
2. 상수 / 설정값
3. helper 함수
4. 클래스 / 함수 구현
5. namespace 종료

### 템플릿

```cpp
#include "control/motor_controller.h"

#include <algorithm>

namespace control {

constexpr int kDefaultSpeed = 10;

namespace {
int ClampSpeed(int speed) {
  return std::max(0, std::min(speed, 100));
}
}  // namespace

void MotorController::InitDevice() {
  // ...
}

void MotorController::SetSpeed(int target_speed) {
  target_speed_ = ClampSpeed(target_speed);
}

}  // namespace control
```

---

## 6. 상수 / 매직 넘버 관리

- 숫자를 직접 사용하지 말고 **의미 있는 상수로 분리**
- 하드웨어 파라미터는 반드시 상수화

```cpp
constexpr int kUartBaudRate = 115200;
constexpr int kPwmMax = 255;
```

---

## 7. 주석 규칙

- **왜 그렇게 했는지 / 제약 / 주의점** 위주로 작성

```cpp
// Jetson Nano에서 프레임 드랍을 방지하기 위해
// 버퍼 크기를 제한한다.
```

### TODO 규칙

```cpp
// TODO(yujin): Jetson Nano I2C timeout 원인 분석 (2026-02-01)
```

---

## 8. 에러 처리

### C 스타일 권장 패턴

- 함수는 `bool` 또는 `int` 반환
- 실패 시 로그 후 상위로 전달

```c
int uart_open(const char* dev) {
  if (dev == NULL) return -1;
  return 0;
}
```

---

## 9. 체크리스트

- [ ] 매직 넘버를 상수로 분리했는가?
- [ ] include는 최소한으로 유지했는가?
- [ ] 전역 변수 사용을 피했는가?
- [ ] 주석은 이유 중심인가?
- [ ] 에러가 상위로 전달되는가?

---

## 10. 자동화 설정 (clang-format)

### clang-format

```yaml
BasedOnStyle: Google
IndentWidth: 2
ColumnLimit: 100
```

### VSCode 설정

```json
{
  "editor.formatOnSave": true,
  "C_Cpp.clang_format_style": "file"
}
```

### 보드 환경 설치

```bash
sudo apt update
sudo apt install -y clang-format
clang-format --version
```
