// sensor/sensor_mqtt.hpp : MQTT 수신을 위한 센서 입력 어댑터 클래스 인터페이스
#pragma once

#include <string>
#include <mutex>
#include "sensor/sensor_interface.hpp"

class SensorMQTT {
    public:
        // 생성자 : MQTT 브로커 정보 설정 --> 백그라운드 수신 스레드(mqttThread)를 띄우기 위한 준비
        SensorMQTT(const std::string& host,
            int port,
            const std::string& topic,
            const std::string& user,
            const std::string& password);
        
        // 소멸자
        ~SensorMQTT();

        // 최신 SensorData 반환
        SensorData read();
    
    // 행동, 로직 : “이 클래스의 내부 행동(Behavior)”
    private:    
        void mqttThread();      // MQTT 수신 스레드 : mosquitto loop 수행
        void parseMessage(const std::string& payload);  // SensorData로 변환
    
    // 상태, 데이터 : “이 클래스의 내부 상태(State)”
    private:
        std::string host_;
        int port_;
        std::string topic_;
        std::string user_;
        std::string password_;
        
        // 멀티스레드 안정성 검증
        std::mutex mtx_;
        SensorData latest_;     // 가장 최근 센서 데이터
        bool running_;
};