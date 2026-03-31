/* status/status_publisher.cpp : 
    - mqtt_connected : 직전에 RPi가 인지한 MQTT 연결 상태 정보 */
#include "status_publisher.hpp"
#include <mosquitto.h>              // MQTT C 라이브러리
#include <jsoncpp/json/json.h>      // JSON 생성
#include <thread>                   // MQTT 루프를 별도의 스레드로 돌리기 위함
#include <chrono>                   // sleep, 시간 제어
#include <ctime>                    // UTC 시간 획득
#include <sstream>
#include <iostream>

// 서버 로그 정렬용 UTC 타임스탬프 : ISO8601 포맷 -> BE,App에서 바로 파싱 가능
static std::string utcNowISO8601() {
    std::time_t now = std::time(nullptr);
    std::tm* gmt = std::gmtime(&now);

    char buf[64];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmt);
    return std::string(buf);
}

// MQTT 클라이언트 생성 & 연결
StatusPublisher::StatusPublisher(const std::string& host,
                                int port,
                                const std::string& topic,
                                const std::string& user,
                                const std::string& password)
    : host_(host), port_(port), topic_(topic), 
      user_(user), password_(password),
      mosq_(nullptr), running_(true), mqtt_connected_(false)
{
    mosquitto_lib_init();   // mosquitto 라이브러리 초기화

    // MQTT Client 핸들 생성
    mosq_ = mosquitto_new(nullptr, true, this);
    if (!mosq_) {
        std::cerr << "[StatusPublisher] mosquitto_new failed\n";
        return;
    }

    // MQTT 인증 서버 사용 설정
    if (!user_.empty())
        mosquitto_username_pw_set((mosquitto*)mosq_, user_.c_str(), password_.c_str());

    // 연결/끊김 콜백 등록
    mosquitto_connect_callback_set((mosquitto*)mosq_, &StatusPublisher::onConnect);
    mosquitto_disconnect_callback_set((mosquitto*)mosq_, &StatusPublisher::onDisconnect);

    // 자동 재연결 활성화 로직 : 네트워크 끊겨도 복구(최초 재연결 시도 1초 후, 최대 대기 : 5초, 네트워크 불안정해도 자동 복구)
    mosquitto_reconnect_delay_set((mosquitto*)mosq_, 1, 5, true);

    // MQTT 서버 접속 : 최초 연결 시도
    int rc = mosquitto_connect((mosquitto*)mosq_, host_.c_str(), port_, 60);
    if (rc != MOSQ_ERR_SUCCESS) {
        std::cerr << "[StatusPublisher] MQTT connect failed: " << mosquitto_strerror(rc) << "\n";
    }

    // MQTT 루프 스레드 시작
    std::thread(&StatusPublisher::mqttThread, this).detach();
}

// 소멸자 - 리소스 정리
StatusPublisher::~StatusPublisher() {
    running_ = false;

    if (mosq_) {
        mosquitto_disconnect((mosquitto*)mosq_);
        mosquitto_destroy((mosquitto*)mosq_);
    }
    mosquitto_lib_cleanup();
}

// MQTT 이벤트 루프
void StatusPublisher::mqttThread() {
    while (running_) {
        // mosquitto_loop() : 100ms마다 네트워크 상태 확인 작업
        int rc = mosquitto_loop((mosquitto*)mosq_, 100, 1);
        if (rc != MOSQ_ERR_SUCCESS) {
            mqtt_connected_ = false;
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            mosquitto_reconnect((mosquitto*)mosq_);

        }
    }
}

void StatusPublisher::onConnect(struct mosquitto*, void* userdata, int rc) {
    auto* self = static_cast<StatusPublisher*>(userdata);
    self->mqtt_connected_ = (rc == 0);
}

void StatusPublisher::onDisconnect(struct mosquitto*, void* userdata, int) {
    auto* self = static_cast<StatusPublisher*>(userdata);
    self->mqtt_connected_ = false;
}

// JSON - 문자열 반환 후, Publish 로직
void StatusPublisher::sendJson(const Json::Value& root, int qos) {
    if (!mosq_) return;

    // 1. JSON -> 문자열 반환
    Json::StreamWriterBuilder writer;
    std::string payload = Json::writeString(writer, root);

    // 2. MQTT publish
    // - orbit/A304-DEV-0001/status/heartbeat 토픽으로 전송
    // - QoS 0 → heartbeat 특성상 손실 허용
    mosquitto_publish((mosquitto*)mosq_, nullptr,
        topic_.c_str(), payload.size(), payload.c_str(), qos, false);
}


// heartbeat JSON 생성 & 송신 (확장) - 10초 주기
void StatusPublisher::publishHeartbeat(const std::string& drive_state,
                              const std::string& stm_state,
                              const std::string& stm_event) {
    if (!mosq_) return;

    // 1. JSON 구성
    Json::Value root;
    root["device_id"]      = "A304-DEV-0001";
    root["drive_state"]    = drive_state;
    root["stm_state"]      = stm_state;         // NORMAL / EMERGENCY
    root["stm_event"]      = stm_event;         // NONE / BUMP
    root["mqtt_connected"] = mqtt_connected_.load();
    root["timestamp"]      = utcNowISO8601();

    sendJson(root, 0); // Qos = 0 : At most once 그냥 던짐 (유실 가능)
}

// event JSON 생성 & 송신 (확장) - 발생하자마자 송신
void StatusPublisher::publishEvent(const std::string& drive_state,
                              const std::string& stm_state,
                              const std::string& stm_event) {
    if (!mosq_) return;

    // 1. JSON 구성
    Json::Value root;
    root["device_id"]      = "A304-DEV-0001";
    root["drive_state"]    = drive_state;
    root["stm_state"]      = stm_state;         // NORMAL / EMERGENCY
    root["stm_event"]      = stm_event;         // NONE / BUMP
    root["mqtt_connected"] = mqtt_connected_.load();
    root["timestamp"]      = utcNowISO8601();

    sendJson(root, 1); // QoS = 1 : At least once 최소 1번은 반드시 전달
}