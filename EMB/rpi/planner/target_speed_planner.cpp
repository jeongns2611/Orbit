// planner/target_speed_planner.cpp : 객체 추종 주행 로직
#include "planner/target_speed_planner.hpp"
#include <algorithm>
#include <cmath>

/* 실제 튜닝해야 되는 값
1. 너무 둔하다(따라가기 늦음)
    - accel_limit_mps2_ ↑ (예: 0.3 → 0.5)
    - 또는 k_dist_ ↑

2. 너무 급하다(튀거나 불안정)
    - accel_limit_mps2_ ↓
    - v_fwd_max_ ↓
*/

TargetSpeedPlanner::TargetSpeedPlanner()
: state_(State::STOP), 
  desired_distance_m_(0.7f),        // 유지 거리(0.7m)
  min_safe_distance_m_(0.15f),       // (후진) 절대 접근 금지 거리 => 0.2m 이내는 절대 위험
  deadband_m_(0.02f),               // (후진) 기준 거리 근처 미세 진동 방지 불감대 (±2cm)
  k_dist_(1.0f),                    // 거리 오차 => 튜닝 필요
  v_fwd_max_(0.5f),                 // 전진 최대 속도
  v_rev_max_(-0.60f),               // 후진 최대 속도
  accel_limit_mps2_(1.3f),          // 가속도 제한
  hold_ms_(400),                    // 센서 유실 후 감속 유지 시간 (400ms)
  stale_ms_(300),                   // 센서 데이터 유효 시간 (300ms)
  last_seen_ms_(0),                 // 마지막으로 타겟을 본 시각
  last_cam_seen_ms_(0),             // 수정
  prev_speed_mps_(0.0f),            // 이전 주기의 출력 속도
  prev_dist_m_(0.0f)                // 수정
{}

/* ======= Helper functions ====== */

// clamp() : 전/후진 속도를 물리적으로 허용 가능한 범위로 제한
float TargetSpeedPlanner::clamp(float x, float low, float high) {
    return std::max(low, std::min(x, high));
}

// applyAccel..() : 현재 주기에 실제로 바꿀 수 있는 속도 생성
float TargetSpeedPlanner::applyAccelLimit(float v_cmd, float dt) {
    if (dt <= 0.0f) return prev_speed_mps_;

    float max_dv = accel_limit_mps2_ * dt;  // 이번 주기에 바꿀 수 있는 최대 속도 변화량(dv)
    float dv = v_cmd - prev_speed_mps_;     // 현재 바꾸려는 양 계산

    // 급가속/급감속 방지 로직
    if (dv >  max_dv) v_cmd = prev_speed_mps_ + max_dv;
    if (dv < -max_dv) v_cmd = prev_speed_mps_ - max_dv;

    return v_cmd;
}

// getStateString() : 현재 로봇의 주행 상태(FSM) 문자열 반환 로직
const char* TargetSpeedPlanner::getStateString() const {
    switch(state_) {
        case State::TRACKING:   return "TRACKING";
        case State::HOLD_DECAY: return "HOLD_DECAY";
        case State::STOP:       return "STOP";
        default:                return "UNKNOWN";
    }
}

// compute() : 전체 제어 흐름 계산 함수 - 핵심 로직
float TargetSpeedPlanner::compute(const SensorData& s, uint64_t now_ms, float dt) { 
    // 0) 센서 데이터 신선도 확인 (True : 유실, False : 유실 X)
    bool sensor_stale =
        (s.stamp_ms == 0) ||
        (now_ms > s.stamp_ms && (now_ms - s.stamp_ms) > stale_ms_);
    // 1) 타겟 인식 시각 갱신
    if (s.has_target && !sensor_stale) {
        last_seen_ms_ = now_ms;
    }
    // 2) FSM 상태 전이
    switch (state_) {
        case State::STOP:
            if (s.has_target && !sensor_stale) {
                state_ = State::TRACKING;
            }
            break;
        case State::TRACKING:
            if (!s.has_target || sensor_stale) {
                state_ = State::HOLD_DECAY;
            }
            break;
        case State::HOLD_DECAY:
            if (s.has_target && !sensor_stale) {
                state_ = State::TRACKING;
            } else if (now_ms - last_seen_ms_ > hold_ms_) { // 400ms 이상 안 보이면 정지
                state_ = State::STOP;
            }
            break;
    }
    // 3) 상태별 속도 계산
    float v_cmd = 0.0f;
    if (state_ == State::TRACKING) {
        float dist  = s.front_distance_m;
        float error = dist - desired_distance_m_;
        // 절대 안전 거리(0.2m) 이하 → 정지
        if (dist <= min_safe_distance_m_) {
            // 너무 가까우면 뒤로 빠지기
            float back_error = dist - min_safe_distance_m_;   // 음수
            v_cmd = k_dist_ * back_error;                     // 음수 속도 생성
            v_cmd = clamp(v_cmd, v_rev_max_, 0.0f);           // 후진만 허용
        }
        else if (std::fabs(error) <= deadband_m_) {
            // deadband를 "정지"가 아니라 "감속 존"으로 사용
            float ratio = std::fabs(error) / deadband_m_;  // 0~1
            v_cmd = prev_speed_mps_ * ratio;
        }
        // 기준 거리 초과 → 전진
        else  {
            v_cmd = k_dist_ * error;
            v_cmd = clamp(v_cmd, v_rev_max_, v_fwd_max_);
        }
    }
    else if (state_ == State::HOLD_DECAY) {
        // 센서 유실 시 부드러운 감속
        constexpr float decay = 0.85f;
        v_cmd = prev_speed_mps_ * decay;
    }
    else {
        // STOP
        v_cmd = 0.0f;
    }
    // 4) 가속도 제한 적용
    v_cmd = applyAccelLimit(v_cmd, dt);
    // 5) 상태 저장
    prev_speed_mps_ = v_cmd;
    return v_cmd;   // 이번 주기에 측정된 현재 속도
}