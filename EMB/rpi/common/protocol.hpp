// common/protocol.hpp : RPi와 STM 간의 통신 규약
#pragma once

// RPi → STM의 송신 API 
#define CMD_SPEED_PREFIX    "SPD:"  // target speed (m/s or rpm)
#define CMD_STEER_PREFIX    "STR:"  // steering command (-1.0 ~ +1.0)
#define CMD_RELEASE_PREFIX  "REL:"  // Fail-safe 해제 요청 

// STM → RPi의 송신 API
#define STAT_PREFIX         "STAT:" // 현재 STM 상태(RUN or 0.42(속도) or 83(RPM))
#define EVT_PREFIX          "EVT:"  // STM에서 발생한 이벤트
#define ACK_PREFIX          "ACK"   // 라파와 STM간의 통신 정상 여부 확인 데이터

// Line ending
#define PROTOCOL_EOL        "\n"    // EOL 기준으로 한 프레임 데이터 끝을 정의
