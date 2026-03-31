// sensor/sensor_mqtt.cpp : 외부 비동기 네트워크 데이터 → 내부 동기 제어 데이터” 변환 계층
#include "sensor/sensor_mqtt.hpp"
#include <mosquitto.h>          // MQTT C 라이브러리
#include <jsoncpp/json/json.h>  // MQTT payload(JSON 문자열)를 구조화된 데이터로 파싱하기 위한 것
#include <thread>
#include <chrono>
#include <cmath>
#include <iostream>
#include <sstream>

// Jetson LiDAR 기준 정면 각도 (튜닝 포인트) : LiDAR 설치 방향이 들어가야함
static constexpr float LIDAR_FRONT_RAD = 0.0f;

// 각도 정규화 (-pi ~ pi) : 제어용 정규화 X, ±4π, ±10rad 값을 안정화 => "[-π, +π] 범위로 wrap"
static float normalizeAngle(float a) {
    while (a >  M_PI) a -= 2 * M_PI;
    while (a < -M_PI) a += 2 * M_PI;
    return a;
}

// 생성자 : MQTT 설정 정보 저장, latest_ 초기화, MQTT 수신 스레드 생성
SensorMQTT::SensorMQTT(const std::string& host,
                       int port,
                       const std::string& topic,
                       const std::string& user,
                       const std::string& password)
    : host_(host),
      port_(port),
      topic_(topic),
      user_(user),
      password_(password),
      running_(true)
{
    latest_ = SensorData{};
    std::thread(&SensorMQTT::mqttThread, this).detach();
}

// 소멸자
SensorMQTT::~SensorMQTT() { running_ = false; }

// planner가 호출하는 인터페이스 (ex. SensorData s = sensor.read())
SensorData SensorMQTT::read() {
    std::lock_guard<std::mutex> lock(mtx_);
    return latest_;
}

// MQTT 전용 이벤트 루프
void SensorMQTT::mqttThread() {
    // 0. mosquitto 라이브러리 초기화
    mosquitto_lib_init();

    // 1. MQTT Client 핸들 생성
    mosquitto* mosq = mosquitto_new(nullptr, true, this);

    // 2. 브로커 인증 설정
    if (!user_.empty()) {
        mosquitto_username_pw_set(mosq, user_.c_str(), password_.c_str());
    }

    // 3. 브로커 연결 및 구독
    mosquitto_connect(mosq, host_.c_str(), port_, 60);      // 브로커 연결 : 60초 주기로 브로커에 생존 신고
    mosquitto_subscribe(mosq, nullptr, topic_.c_str(), 0);  // 토픽 구독

    // 4. Message Callback
    mosquitto_message_callback_set(
        mosq,
        // userdata : Client 핸들에 넣었던 this, msg->payload : 실제 데이터, msg->payloadlen : 데이터 길이
        [](mosquitto*, void* userdata, const mosquitto_message* msg)
        {
            auto* self = static_cast<SensorMQTT*>(userdata);
            std::string payload((char*)msg->payload, msg->payloadlen);
            self->parseMessage(payload);
        }
    );

    // 100ms timeout 기반 비동기 polling : main 제어 주기 영향 X
    while (running_) { mosquitto_loop(mosq, 100, 1); }

    // 5. 종료
    mosquitto_destroy(mosq);    // client handle 해제
    mosquitto_lib_cleanup();    // 라이브러리 전역 자원 해제
}

void SensorMQTT::parseMessage(const std::string& payload) {
    Json::Value root;
    Json::CharReaderBuilder builder;
    std::string errs;

    std::istringstream iss(payload);
    if (!Json::parseFromStream(builder, iss, &root, &errs)) {
        return;
    }

    SensorData s;   // 0. 센서 객체 선언

    s.has_target = root["detected"].asFloat();      // 1. 타겟 감지 여부 등록
    s.front_distance_m = root["dist"].asFloat();    // 2. dist -> front_distance_m

    float lidar_angle = root["angle"].asFloat();
    s.target_angle_rad = normalizeAngle(lidar_angle - LIDAR_FRONT_RAD); // 3. 정규화된 angle 값 -> target_rad

    // 4. timestampe 부여
    s.stamp_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()
        ).count();
    
    // 5. 최신 데이터 갱신
    std::lock_guard<std::mutex> lock(mtx_);
    latest_ = s;
}