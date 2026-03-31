// sensor/sensor_dummy.cpp : 가상 시뮬레이션 센서용 (testbench)
#include "sensor/sensor_interface.hpp"
#include <chrono>
#include <cmath>

SensorData readDummySensor()
{
    static uint64_t start_ms = 0;
    static float dist = 2.0f;
    static bool approaching = true;

    SensorData data;

    // 1) timestamp (ms 기준, 매우 중요)
    uint64_t now_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()
        ).count();

    if (start_ms == 0) start_ms = now_ms;
    uint64_t t = now_ms - start_ms;     // eLapsed time (ms)

    data.stamp_ms = now_ms;

    // 시나리오 분기
    // 시나리오 1: 정상 추종 (0~200)
    if (t < 4000) {
        data.has_target = true;

        // 거리 변화 : 2.0 -> 0.4 -> 2.0
        if (approaching) {
            dist -= 0.01f;
            if (dist <= 0.4f) approaching = false;
        } else {
            dist += 0.01f;
            if (dist >= 2.0f) approaching = true;
        }
        data.front_distance_m = dist;

        // 각도 : 좌우로 부드럽게 흔들림 ((±0.3 rad))
        data.target_angle_rad = 0.3f * std::sin(t * 0.05f);
    }

    // 시나리오 2 : 타겟 순간 끊김 (200 ~ 220)
    else if (t < 4500) {
        data.has_target = false;
        data.front_distance_m = dist;
        data.target_angle_rad = 0.0f;
    }

    // 시나리오 3 : 다시 정상 추종 (220 ~ 350)
    else if (t < 7000) {
        data.has_target = true;

        data.front_distance_m = dist;
        data.target_angle_rad = 0.25f * std::sin(t * 0.04f);
    }

    // 시나리오 4 : 각도 힘(outLier) 테스트 (350~370)
    else if (t < 7500) {
        data.has_target = true;
        data.front_distance_m = dist;

        // 정상 범위를 벗어난 튐
        data.target_angle_rad = (t/100) % 2 ? 1.2f : -1.2f;
    }

    // 시나리오 5 : 장기 끊김 -> CENTER (370 ~ )
    else {
        data.has_target = false;
        data.front_distance_m = dist;
        data.target_angle_rad = 0.0f;
    }

    return data;
}