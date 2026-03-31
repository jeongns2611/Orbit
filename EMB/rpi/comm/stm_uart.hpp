// comm/stm_uart.hpp : STM UART 인터페이스
// UART를 파일 디스크립터(fd)로 다루는 Linux 방식 캡슐화
#pragma once

#include <string>

// 수신 스레드 사용을 위한 헤더
#include <atomic>
#include <thread>
#include <mutex>

#include "../common/types.hpp"

// StmUart: STM과의 UART 통신을 담당하는 객체 => RPi쪽에서 STM을 하나의 장치로 다룸
class StmUart {
    public:     // main.cpp or 다른 모듈 코드가 직접 호출할 수 있는 기능 
        explicit StmUart(const std::string& device, int baudrate);  // UART 장치 열고 초기화(생성자)
        ~StmUart();     // 소멸자

        bool isOpen() const;    // UART가 정상적으로 열렸는지 확인

        bool sendTargetSpeed(float speed);  // 목표 속도를 UART로 STM에 송신하는 함수
        bool sendTargetSteer(float steer);  // 목표 조향를 UART로 STM에 송신하는 함수
        bool sendRelease();                 // Fail-safe UART로 STM에 해제 요청 송신하는 함수
        
        // 최신 STM 상태/이벤트 스냅샷 얻기 (main.cpp에서 사용 예정)
        StmRxStatus getLatestStatus() const;

        // 이벤트 Push용 : Pending 이벤트 가져오기/지우기
        // - 있으면 true와 함께 out에 담아줌
        bool popPendingEvent(StmEvent& out_event);

    private:
        int fd_;    // fd_ : UART 장치를 가리키는 Linux 파일 디스크립터

        // RX thread 생성
        std::atomic<bool> rx_running_{false};
        std::thread rx_thread_;

        // 최신 상태/이벤트 보관 (thread-safe)
        mutable std::mutex status_mtx_;
        StmRxStatus latest_;            // default NORMAL/NONE

        // Latched event (덮이지 않도록)
        mutable std::mutex event_mtx_;
        bool event_pending_{false};
        StmEvent pending_event_{StmEvent::NONE};

        // 내부 : RX 루프 & 파서
        void rxLoop();
        bool readLine(std::string& out);            // STM에서 오는 데이터를 "\n" 단위로 수신하는 함수
        void parseLine(const std::string& line);
};