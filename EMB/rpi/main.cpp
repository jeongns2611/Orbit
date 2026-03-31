/* main.cpp
 * - 고정 주기 제어 루프 (20Hz)
 * - Speed / Steer planner를 동일 주기로 호출
 * - STM에는 항상 최신 목표만 전달
*/
#include <iostream>
#include <unistd.h>
#include <chrono>       // steady_clock
#include <algorithm>

#include "comm/stm_uart.hpp"                // STM과 UART 통신을 담당하는 "추상화 클래스"
#include "planner/target_speed_planner.hpp"
#include "planner/target_steer_planner.hpp"
#include "sensor/sensor_interface.hpp"
#include "sensor/sensor_mqtt.hpp"           // SensorMQTT 객체 클래스
#include "status/status_publisher.hpp"      // StatusPublisher 객체 클래스
#include "control/drive_state_policy.hpp"   // driveState 연동을 위한 클래스

#include "control/emergency_release.hpp"    // Emergency 해제를 위한 레이어 클래스

using Clock = std::chrono::steady_clock;

// MQTT 환경 정보
const std::string HOST = "i14a304.p.ssafy.io";
const int PORT         = 8000;
const std::string USER = "a304";
const std::string PWD  = "a304";

// MQTT 토픽 정보
const std::string SENSORTOPIC = "rpi/fusion/target";                    // 수신 : 센서 토픽
const std::string STATUSTOPIC = "orbit/A304-DEV-0001/status/heartbeat"; // 송신 : RPi 상태 토픽

// Emergency 해제의 단발성 트리거 상태 변수
static bool release_latched = false;

int main() {
    StmUart stm("/dev/ttyAMA2", 115200);    // UART 객체 생성
    if (!stm.isOpen()) {
        std::cerr << "STM UART not opened\n";
        return -1;
    }

    // SensorMQTT 객체 생성
    SensorMQTT mqtt_sensor(HOST, PORT, SENSORTOPIC, USER, PWD);

    // StatusPubMQTT 객체 생성
    StatusPublisher status_pub(HOST, PORT, STATUSTOPIC, USER, PWD);

    TargetSpeedPlanner speed_planner;   // 구동
    TargetSteerPlanner steer_planner;   // 조향

    auto prev_time = Clock::now();
    auto last_hb   = Clock::now();      // MQTT Publish 마지막 전송 주기

    // 제어 주기 설정
    constexpr int LOOP_HZ = 20;             // 20Hz
    constexpr int LOOP_MS = 1000 / LOOP_HZ; // 50ms
    constexpr int HEARTBEAT_SEC = 10;       // Heartbest = 10초
    
    std::cout << "[INFO] Control loop start (" << LOOP_HZ << " Hz)\n";

    while(true) {
        auto now_time = Clock::now();

        // 0) 시간 변화율(dt) 계산
        float dt =
            std::chrono::duration<float>(now_time - prev_time).count();
        prev_time = now_time;

        dt = std::min(dt, 0.1f);        // dt 보호(지연 발생 대비)

        /* 1) 현재 시간 계산 */
        uint64_t now_ms =
            std::chrono::duration_cast<std::chrono::milliseconds>(
                Clock::now().time_since_epoch()
            ).count();
        
        /* 2) 센서 데이터 읽기 */
        SensorData s = mqtt_sensor.read();

        /* 3) Speed & Steer Planner 계산 */
        float target_speed = speed_planner.compute(s, now_ms, dt);
        float target_steer = steer_planner.compute(s, now_ms, dt);

        /* 4) STM 상태 조회 */
        StmRxStatus stm_status = stm.getLatestStatus();

        /* 5) Driver State 정책 적용 */
        std::string drive_state = resolveDriveState(stm_status, speed_planner);
        
        /* 6) EMERGENCY 상태일 때, 해제 요청 명령 */
        if (stm_status.state == StmState::EMERGENCY) {
            if (pollReleaseKey() && !release_latched) {
                std::cout << "[RPi] RELEASE requested by user\n";
                stm.sendRelease();
                release_latched = true;     // 단발성 래치

                // 이벤트 전송 (선택 사항) : 이벤트 전송 관련 코드(status_publisher.hpp/cpp) 수정해야댐
                // status_pub.publishEvent( ... );
            }
        } else {
            // EMERGENCY가 풀리면 다시 래치 해제
            release_latched = false;
        }

        /* 7) 이벤트 즉시 처리 (큐 소진) */
        StmEvent ev;
        while(stm.popPendingEvent(ev)) {
            if (ev == StmEvent::BUMP)
                stm_status.state = StmState::EMERGENCY; // 상태 보정
            
            drive_state = resolveDriveState(stm_status, speed_planner);

            status_pub.publishEvent(
                toString(ev), 
                toString(stm_status.state), 
                drive_state
            );
        }

        /* 8) Heartbeat (10초) */
        if (std::chrono::duration_cast<std::chrono::seconds>(
            Clock::now() - last_hb).count() >= HEARTBEAT_SEC) {
            
            last_hb = Clock::now();

            std::string drive_state = resolveDriveState(stm_status, speed_planner);

            status_pub.publishHeartbeat(
                drive_state,
                toString(stm_status.state),
                toString(stm_status.event)
            );
        }

        /* 9) Safety Gate : : Emergency 상황일 때, STM 송신 막기 */
        if (stm_status.state != StmState::EMERGENCY) {
            stm.sendTargetSpeed(target_speed);
            stm.sendTargetSteer(target_steer);
        } else {
            std::cout << "[RPi] Control blocked (STM in EMERGENCY)\n";
        }

        /* 10) Debug */
        std::cout
            << "[RPi] target=" << s.has_target
            << " dist="  << s.front_distance_m
            << " angle=" << s.target_angle_rad
            << " v_cmd=" << target_speed
            << " steer=" << target_steer
            << " drive_state=" << drive_state
            << std::endl;

       // 주기 유지 (50ms, 20Hz)
       usleep(LOOP_MS*1000);        
    }

    return 0;
}