/* sensor/sensor_interface.hpp : planner가 보는 Interface
- sensor_interface : planner와의 계약서(즉, 해당 파일에서 지정한 구조만 planner가 인식함)
- sensor/ : 
    - RPi의 외부 세계(LiDAR, Carmerar 등)의 번역기 기능
    - DDS/ROS2 의존 계층

- planner는 정책(policy) 담당
    - Jetson/LiDAR가 바뀌어도, DDS가 끊겨다가 살아나도 변하면 안되는 것
    - 즉, 의사결정 두뇌
*/

#pragma once
#include <cstdint>

struct SensorData {
    // 공통
    bool has_target        = false;     // 카메라 기반 : 타겟 존재 여부
    uint64_t stamp_ms      = 0;         // 데이터 시각(ms) - 이 데이터가 현재 유효한지 판단을 위한 장치

    // Target_speed 계산을 위한 데이터 (Speed planner)
    float front_distance_m = 0.0f;      // 라이다 기반 : 타겟까지 거리(m)

    // Target_steer 계산을 위한 데이터 (Steer planner)
    float target_angle_rad = 0.0f;      // 라이다 + 카메라 퓨전 : 타겟까지 거리(rad)
    
    /* 타겟 방위각(rad)
      - 0.0 = 정면
      - + = 우측, - = 좌측
      - 권장 범위: [-0.6 ~ +0.6] rad (튜닝 가능)
      - has_target + stamp_ms = 센서 끊김을 부드럽게 처리하는 "짧은 완충 홀드"
      - 즉, 부드러운 감쇠 + 안전 종료 */
};                 

/* 센서 공급자는 이 함수를 통해 최신 데이터를 제공해야 함
   현재는 더미로 구현, 나중에 ROS2 subscriber가 구현함
   ex) readDummySensor() --> readRos2SensorData()  */
SensorData readDummySensor();
