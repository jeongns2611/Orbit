// planner/target_steer_planner.cpp : 객체 추종 조향 로직
#include "planner/target_steer_planner.hpp"
#include <algorithm>
#include <cmath>

constexpr float STEER_DEADBAND = 0.02f;  // ≈ 6µs

TargetSteerPlanner::TargetSteerPlanner()
: state_(State::CENTER),            // 시작 시 조향은 직진(0)
  front_fov_rad_(M_PI/4.0f),        // ±45° : 전방에서만 조향 (+45°:오른쪽 최대 각, -45°:왼쪽 최대 각)
  steering_max_rad_(0.45f),         // 약 ±20°에서 steer=±1
  angle_deadband_rad_(0.03f),       // 아주 작은 각도(약 1.7도, 센서 노이즈)를 "직진 처리"
  max_valid_bearing_rad_(M_PI),     // bearing outlier 컷

  center_decay_rate_ref_(0.85f),    // 20Hz 기준에서 85% 유지
  dt_ref_(0.05f),                   // 20Hz = 50ms
  hold_ms_(400),                    // 300ms 정도는 끊겨도 부드럽게 제어
  stale_ms_(300),                   // 데이터가 너무 오래되면 안전하게 0으로
  steer_rate_limit_per_s_(3.0f),    // 1초에 최대 3.0만큼 변함(튜닝)
  last_seen_ms_(0),
  prev_steer_(0.0f)
{}

// clamp : 출력 범위 강제
float TargetSteerPlanner::clamp(float x, float low, float high) {
    return std::max(low, std::min(x, high));
}

// 조향 변화율 제한 : 이번 dt에 바꿀 수 있는 steer 변화량 제한
float TargetSteerPlanner::applyRateLimit(float steer_cmd, float dt) {
    if (dt <= 0.0f) return prev_steer_;

    float max_ds = steer_rate_limit_per_s_ * dt;    // 이번 주기에 가능한 최대 변화량
    float ds = steer_cmd - prev_steer_;

    if (ds >  max_ds) steer_cmd = prev_steer_ + max_ds;
    if (ds < -max_ds) steer_cmd = prev_steer_ - max_ds;

    return steer_cmd;
}

float TargetSteerPlanner::compute(const SensorData& s, uint64_t now_ms, float dt) {

    // 0) 데이터 신선도 확인(수정 & New)
    bool sensor_stale = (s.stamp_ms == 0) || (now_ms > s.stamp_ms && (now_ms - s.stamp_ms) > stale_ms_);
    if (sensor_stale) {
        state_ = State::HOLD_DECAY;
    }

    // 1) 타겟 감지 시각 갱신(수정 & New)
    if (s.has_target && !sensor_stale) {
        last_seen_ms_ = now_ms;
    }

    // 2) 상태 전이
    switch (state_)
    {
        case State::CENTER:
            if (s.has_target) state_ = State::TRACKING;
            break;
    
        case State::TRACKING:
            if (!s.has_target) state_ = State::HOLD_DECAY;
            break;
        
        case State::HOLD_DECAY:
            if (s.has_target) state_ = State::TRACKING;
            else {
                if (now_ms - last_seen_ms_ > hold_ms_) state_ = State::CENTER;
            }
            break;
    }

    // 3) 상태별 조향 계산
    float steer_cmd = 0.0f;

    if (state_ == State::TRACKING) {
        // Jetson에서 받은 bearing (-pi ~ +pi)
        float bearing = s.target_angle_rad;     // Jetson이 준 "최종 각도"를 그대로 사용

        // Jetson 각도 이상치(outLier) 1차 차단
        bearing = clamp(bearing, -max_valid_bearing_rad_, max_valid_bearing_rad_);

        // deadband : 조향 떨림 감소(작은 노이즈 무시)
        if (std::fabs(bearing) > front_fov_rad_) {
            // 뒤쪽/측면 타겟 → 조향으로 해결하지 않음
            state_ = State::HOLD_DECAY;
            steer_cmd = prev_steer_;
        } else {
            // 전방 타겟 → steering error로 변환
            float steering_error = bearing;

            // deadband
            if (std::fabs(steering_error) <= angle_deadband_rad_) {
                steer_cmd = 0.0f;
            }
            else {
                // angle(rad) → steer 정규화
                float normalized = steering_error / steering_max_rad_;
                steer_cmd = clamp(normalized, -1.0f, 1.0f);
            }
        }
    }
    else if (state_ == State::HOLD_DECAY) {
        // 끊김 완충 :중앙으로 천천히 복귀
        // steer_cmd = prev_steer_ * center_decay_rate_;
        
        // dt 기반 중앙 복귀(기준 : 20Hz에서 0.85)
        float decay = std::pow(center_decay_rate_ref_, dt / dt_ref_);
        steer_cmd = prev_steer_ * decay;
    }
    else {  // CENTER
        steer_cmd = 0.0f;
    }

    // 4) 변화율 제한
    steer_cmd = applyRateLimit(steer_cmd, dt);

    // 5) Servo-aware steer deadband 
    if (std::fabs(steer_cmd) < STEER_DEADBAND)
    steer_cmd = 0.0f;

    // 6) 상태 저장
    prev_steer_ = steer_cmd;

    return steer_cmd;
}