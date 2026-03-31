// common/types.hpp : RPi와 STM 간의 통신 데이터 구조 정의
#pragma once
#include <cstdint>   // uint8_t 정의
// RPi가 계산한 의사결정 최종 데이터
struct ControlCommand {
    float target_speed;     // 목표 속도(m/s or rpm)
    float target_steering;  // 목표 조향각(deg (현재 사용 X))
};

// RPi에게 알려줄 현재 STM 상태 데이터
struct StmStatus {
    bool motor_enabled;     // 모터 동작 여부
    float current_speed;    // STM이 추정한 실제 속도
    int pwm;                // STM이 실제로 모터에 인가 중인 PWM
};

// STM의 상태 타입 정의 => 추후 상태가 추가되면 해당 부분에서 추가
// enum class(열거형 클래스) : 즉, StmState가 가질 수 있는 값들 정의 (사용자 정의 선택지 리스트)
enum class StmState : uint8_t {
    NORMAL = 0,
    EMERGENCY
};

// STM의 이벤트 타입 정의 => 추후 이벤트가 추가되면 해당 부분에서 추가
// enum class(열거형 클래스) : 즉, StmEvent가 가질 수 있는 값들 정의 (사용자 정의 선택지 리스트)
enum class StmEvent : uint8_t {
    NONE = 0,
    BUMP
};

// STM의 Rx 정보 구조체 정의 => 추후 StmState, StmEvent의 값이 추가되면 별도로 default 값 설정
// struct (구조체) : 즉, 서로 다른 데이터(StmState, StmEvent)를 하나로 묶은 덩어리
struct StmRxStatus {
    StmState state = StmState::NORMAL;  // default : NORMAL
    StmEvent event = StmEvent::NONE;    // default : NONE
};

// 문자열 헬퍼
inline const char* toString(StmState s) {
    return (s == StmState::EMERGENCY) ? "EMERGENCY" : "NORMAL";
}

inline const char* toString(StmEvent e) {
    return (e == StmEvent::BUMP) ? "BUMP" : "NONE";
}