/* planner/target_steer_planner.hpp : 객체 추종 조향 로직 인터페이스

TargetSteerPlanner
    - 입력: SensorData (bearing rad 기반), now_ms, dt
    - 출력: target_steer ∈ [-1.0, +1.0]

전제:
    - s.target_angle_rad 는 "로봇 기준 타겟 방위각(bearing)" [-pi, +pi] (rad)
    - s.has_target 는 타겟 탐지 여부
    - s.stamp_ms 는 센서 데이터 타임스탬프(ms)

목표:
    - 전방 영역에서만 조향을 수행 (후방/측면 타겟은 조향으로 해결하지 않음)
    - 타겟 끊김/센서 stale 시 중앙 복귀(안전)
    - deadband/변화율 제한으로 조향 jitter 최소화 */
#pragma once
#include <cstdint>
#include <cmath>
#include "sensor/sensor_interface.hpp"

class TargetSteerPlanner {
    public:
        TargetSteerPlanner();

        // compute() : 센서 기반 target_steer 계산 (bearing -> steer)
        //  - now_ms : 현재 시간(ms)
        //  - dt     : 이전 호출 이후 경과 시간(sec)
        //  - return : [-1.0, +1.0]
        float compute(const SensorData& s, uint64_t now_ms, float dt);

    private:
        enum class State {  // 조향 FSM 
            TRACKING,       // 정상 추종
            HOLD_DECAY,     // 완충 조향 제어
            CENTER          // 직진 복귀
        };

        State state_;

        /* ==== 파라미터(*_ : 클래스 멤버 구분자로 정의) ==== */
        float front_fov_rad_;           // bearing을 조향 입력으로 인정하는 전방 시야 범위
        float steering_max_rad_;        // 이 각도 오차면 steer=±1로 포화"시키는 기준 각도 (튜닝 포인트) => 조향 민감도/응답성
        float angle_deadband_rad_;      // 각도 불감대 : 작은 각도 무시 => 각도 jitter 억제
        float max_valid_bearing_rad_;   // 입력 각도 이상치 제한(outlier cut) => 물리적으로 말도 안 되는 튐 값 방지 ([-pi, +pi] 범위)

        /* ==== 타겟 끊김/안전 복귀 파라미터 ==== */
        float center_decay_rate_ref_;   // 기준 주기에서의 감쇠율 => dt가 달라도 pow로 보정함으로써 감쇠 일정하게 진행
        float dt_ref_;                  // 기존 주기(sec) : 0.05s = 20Hz
        float steer_rate_limit_per_s_;  // 조향 변화율 제한 (steer/s)
        uint32_t hold_ms_;              // 타겟 끊김 완충 시간
        uint32_t stale_ms_;             // 센서 데이터 유효 시간

        // State vars(상태 변수)
        uint64_t last_seen_ms_;         // 마지막으로 타겟을 본 시각
        float prev_steer_;              // 이전 주기 출력

        // Helpers
        static float clamp(float x, float low, float high);
        float applyRateLimit(float steer_cmd, float dt);
};