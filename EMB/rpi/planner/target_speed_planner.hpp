// planner/target_speed_planner.hpp : 객체 추종 주행을 위한 인터페이스
#pragma once
#include <cstdint>
#include <string>
#include "sensor/sensor_interface.hpp"

class TargetSpeedPlanner {
    public:
        TargetSpeedPlanner();   // 생성자

        // compute : 센서 기반 Target_speed 계산
        // s       : 센서 스냅샷 객체
        // now_ms  : RPi 기준 현재 시각(ms)
        // dt      : 이전 호출 이후 경과 시간
        float compute(const SensorData& s, uint64_t now_ms, float dt);

        // 현재 주행 FSM 상태를 외부(MQTT 브로커 서버)에서 조회하기 위한 인터페이스
        const char* getStateString() const;
        
    private:
        enum class State {  // 주행 FSM
            TRACKING,       // 정상 추종 상태 
            HOLD_DECAY,     // 센서 유실 시 완충 감속 상태
            STOP            // 완전 정지
        }; 
        
        State state_;

        /* ==== 파라미터(*_ : 클래스 멤버 구분자로 정의) ==== */
        float desired_distance_m_;      // 객체와의 유지 거리(m) => 목표 거리 : 0.3m
        float min_safe_distance_m_;     // (후진) 절대 접근 금지 거리 => 0.2m 이내는 절대 위험
        float deadband_m_;              // (후진) 기준 거리 근처 미세 진동 방지 불감대 (±2cm) 
        float k_dist_;                  // 거리 P Gain (거리 오차 → 속도 변환 비율)
        
        float v_fwd_max_;               // 전진 최대 속도 (m/s) => 실험 값으로 찾기
        float v_rev_max_;               // 후진 최대 속도 (m/s) => 실험 값으로 찾기
        float accel_limit_mps2_;        // 가속도 제한 (m/s^2)

        uint32_t hold_ms_;              // 센서 유실 후 감속 유지 시간
        uint32_t stale_ms_;             // 센서 데이터 유효 시간

        /* ==== 상태 변수 ==== */
        uint64_t last_seen_ms_;         // cam or dist 마지막 유효 시각
        uint64_t last_cam_seen_ms_;     // cam 마지막 유효 시각(수정 & New)
        float prev_speed_mps_;          // 이전 주기의 출력 속도
        float prev_dist_m_;             // 이전 주기의 출력 거리(수정 & New)


        /* ==== Helpers ==== */
        static float clamp(float x, float low, float high);
        float applyAccelLimit(float v_cmd, float dt);
};
