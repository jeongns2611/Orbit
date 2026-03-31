/* comm/stm_uart.cpp :
 1.UART 포트를 연다 (open)
 2.UART 설정을 한다 (termios)
 3.문자열을 보낸다 (write)
 4.한 줄을 읽는다 (read를 1바이트씩)그리고 끝날 때 포트를 닫는다 (close) */
#include "stm_uart.hpp"
#include "../common/protocol.hpp"

#include <fcntl.h>      // open(), Option(O_RDWR, etc)
#include <unistd.h>     // read(), write(), close()
#include <termios.h>    // UART 설정(baudrate, parity 등)
#include <cstring>      // strlen()
#include <iostream>     // cout
#include <chrono>

// === UART 포트 객체 열고 설정하는 로직 ===
StmUart::StmUart(const std::string& device, int baudrate) : fd_(-1) {

    // 1. 장치 열기 : O_RDWR, O_NOCTTY(해당 장치를 프로그램의 터미널로 사용 X), O_SYNC : write 즉시 반영 옵션
    fd_ = open(device.c_str(), O_RDWR | O_NOCTTY | O_SYNC);
    if (fd_ < 0) {
        perror("Error : UART open failed");
        return;
    }

    // 2. termios 구조체 가져오기
    struct termios tty {};      // termios : UART(Serial Port)의 설정 묶음
    tcgetattr(fd_, &tty);       // 현재 포트 설정을 읽어와서 tty에 할당

    // 3. baudrate 설정
    cfsetospeed(&tty, B115200); // 송신(output speed) 속도 : 115200
    cfsetispeed(&tty, B115200); // 수신(input speed) 속도  : 115200

    // 4. Data bit/기본 동작 설정(c_cflag)
    tty.c_cflag = (tty.c_cflag & ~CSIZE) | CS8;  // CSIZE(데이터 비트 길이 설정)을 지우고, CS8(8bit 데이터)로 설정
    tty.c_cflag |= (CLOCAL | CREAD);             // CLOCAL(모뎀 제어 신호 무시), CREAD(수신 enable)
    tty.c_cflag &= ~(PARENB | CSTOPB | CRTSCTS); // PARENB(parity), CSTOPB(stop bit), CRTSCTS(CTS/RTS) 사용 X 
    // 최종 결과 : 8N1(8 data bits, No parity, 1 stop bit)

    tty.c_lflag = 0;
    tty.c_iflag = 0;
    tty.c_oflag = 0;

    // 5. read 동작 제어 : VMIN/VTIME
    tty.c_cc[VMIN] = 0;
    tty.c_cc[VTIME] = 5;      // 0.5s Timeout : 데이터가 안 오면 0.5s 기다리고 0 return 

    // 6. 1 ~ 5 설정을 즉시 적용(TCSANOW)
    tcsetattr(fd_, TCSANOW, &tty);

    // 7. RX 스레드 시작 
    rx_running_.store(true);
    rx_thread_ = std::thread(&StmUart::rxLoop, this);
}

// === 소멸자 : 포트 닫기 ===
StmUart::~StmUart() {
    // 소멸자에서도 스레드 종료 
    rx_running_.store(false);
    if (rx_thread_.joinable()) rx_thread_.join();

    if (fd_ >= 0) close(fd_);
}

bool StmUart::isOpen() const {
    return fd_ >= 0;
}

// === RPi가 STM로 보낼 데이터를 문자열로 만들어서 송신(write) ===
bool StmUart::sendTargetSpeed(float speed) {
    if (fd_ < 0) return false;  // Port 안 열리면 실패

    char buf[64];
    snprintf(buf, sizeof(buf), "%s%.2f%s", CMD_SPEED_PREFIX, speed, PROTOCOL_EOL);
    // CMD_SPEED_PREFIX = "SPD:", speed = "0.45", PROTOCOL_EOL = "\n"
    // 최종 buf 값 : "SPD:0.45\n"

    return write(fd_, buf, strlen(buf)) > 0;    // UART로 최종 buf 값을 문자열로 송신
}

// === RPi가 STM로 보낼 데이터를 문자열로 만들어서 송신(write) ===
bool StmUart::sendTargetSteer(float steer) {
    if (fd_ < 0) return false;

    char buf[64];
    snprintf(buf, sizeof(buf), "%s%.3f%s", CMD_STEER_PREFIX, steer, PROTOCOL_EOL);

    return write(fd_, buf, strlen(buf)) > 0;
}

/* === RPi → STM로 Fail-safe 해제 명령 송신 === */
bool StmUart::sendRelease() {
    if (fd_ < 0) return false;

    char buf[64];
    snprintf(buf, sizeof(buf), "%s%d%s", CMD_RELEASE_PREFIX, 1, PROTOCOL_EOL);

    return write(fd_, buf, strlen(buf)) > 0;
}

// === RPi가 STM로부터 받은 데이터 수신(read) ===
bool StmUart::readLine(std::string& out) {
    if (fd_ < 0) return false;

    char ch;
    out.clear();    // 출력 문자열 비우고 시작

    while(true) {
        // 1. n(읽은 바이트 수)으로 1byte씩 읽음
        int n = read(fd_, &ch, 1);
        if (n <= 0) return false;

        // 2. \n이 나올 때까지 문자열에 누적
        if (ch == '\n') break;
        out += ch;

        // 즉, STM이 "ACK\n" 보내면 out은 "ACK"가 되는 구조
    }

    return true;
}

// ==== 수신 UART 데이터 문자열 파싱 구현 ====
void StmUart::parseLine(const std::string& line) {
    // EVT
    if (line.rfind(EVT_PREFIX, 0) == 0) {
        if (line == "EVT:BUMP") {
            // 1) Latest_ 업데이트
            {
                std::lock_guard<std::mutex> lk(status_mtx_);
                latest_.event = StmEvent::BUMP;
                // 주의 : 여기서 Latest_.event를 NONE으로 되돌릴 필요 X (상태 의미X)
            }

            // 2) pending 래치 (덮이지 않게)
            {
                std::lock_guard<std::mutex> lk(event_mtx_);
                pending_event_ = StmEvent::BUMP;
                event_pending_ = true;
            }
        }
        // EVT:NONE은 "상태"로만 쓰고, pending은 건드리지 않을 것
        else if (line == "EVT:NONE") {
            std::lock_guard<std::mutex> lk(status_mtx_);
            latest_.event = StmEvent::NONE;
        }
        return;
    }

    // STAT
    if (line.rfind(STAT_PREFIX, 0) == 0) {
        std::lock_guard<std::mutex> lk(status_mtx_);

        if (line == "STAT:EMERGENCY") latest_.state = StmState::EMERGENCY;
        else                          latest_.state = StmState::NORMAL;
        return;
    }
}

// EVT:BUMP가 순간적으로 지나가도 절대 안 사라짐 => main이 한번 publishEvent()할 때까지 남아있음
bool StmUart::popPendingEvent(StmEvent& out_event) {
    std::lock_guard<std::mutex> lk(event_mtx_);

    if (!event_pending_) return false;

    out_event = pending_event_;
    event_pending_ = false;
    pending_event_ = StmEvent::NONE;
    return true;
}

// === 수신 UART RX 스레드 rxLoop 구현 ===
void StmUart::rxLoop() {
    std::string line;

    while(rx_running_.load()) {
        if (fd_ < 0) break;

        if (readLine(line)) {
            // std::cout << "[STM->RPi]" << Line << std::endl; // Debug
            parseLine(line);
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(5));
        }
    }
}

StmRxStatus StmUart::getLatestStatus() const {
    std::lock_guard<std::mutex> lk(status_mtx_);
    return latest_;
}