/* status/status_publisher.hpp : Rpi의 현재 상태를 MQTT로 주기적으로 외부 서버에 송신하는 모듈 인터페이스
    - sensor/  : 외부 세계 입력 데이터
    - planner/ : 의사 결정 로직(주행, 조향)
    - comm/    : STM 제어를 위한 UART 송신
    - status/  : Back-end 서버로 "현재 상태"를 송신하기 위한 계층
*/

#pragma once
#include <string>               // MQTT 서버 주소, 토픽, 유저명 저장용 문자열
#include <atomic>               // MQTT 통신 스레드 안전 종료하기 위한 플래그 => 멀티 스레드 Race condition 방지
#include <jsoncpp/json/json.h>  // Json::Value 타입

class StatusPublisher {     // RPi의 현재 상태를 JSON으로 MQTT 송신 클래스 
    public:
        StatusPublisher(const std::string& host,
                        int port,
                        const std::string& topic,
                        const std::string& user,
                        const std::string& password);   // MQTT Publish 생성자 : 상태 송신 전용 MQTT Client 생성
        
        ~StatusPublisher();             // MQTT Publish 소멸자 : MQTT 통신 스레드 종료

        // publish (Event와 Hearbeat 분리)
        void publishHeartbeat(const std::string& drive_state,
                            const std::string& stm_state,
                            const std::string& stm_event);
        
        void publishEvent(const std::string& drive_state,
                        const std::string& stm_state,
                        const std::string& stm_event);
        

        bool isConnected() const { return mqtt_connected_.load(); };  // 디버그/외부 확인용
        
    private:
        // mosquitto_loop()를 백그라운드에서 돌리기 위한 함수 
        // => main의 제어 루프(20Hz)와 MQTT 통신과 독립적으로 실행하기 위함
        void mqttThread();
        
        // sendJson
        void sendJson(const Json::Value& root, int qos);

        // mosquitto callback 함수
        static void onConnect(struct mosquitto* mosq, void* userdata, int rc);
        static void onDisconnect(struct mosquitto* mosq, void* userdata, int rc);

        // MQTT 설정 정보
        std::string host_;
        int port_;
        std::string topic_;
        std::string user_;
        std::string password_;
        
        void* mosq_;                        // 포인터 기반 mosquitto 핸들(mosquitto*)
        std::atomic<bool> running_;         // 스레드 제어 플래그
        std::atomic<bool> mqtt_connected_;  // RPi <-> MQTT 브로커 서버의 네트워크 연결 상태
};