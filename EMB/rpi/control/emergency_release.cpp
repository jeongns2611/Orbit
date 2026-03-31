/* control/emergency_release.cpp : Release 해제 로직 구현
    - 메인 루프(main.cpp)를 멈추지 않은 상태 => non-blocking
    - Non-blocking 상황에서 키 입력으로 폴링해서 r/R 입력 감지
    - r/R 감지 -> True -> Release mode
*/

#include "emergency_release.hpp"
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstdlib>      //atexit

static struct termios g_oldt;
static bool g_inited = false;

// 현재 터미널 설정(원본) 저장 함수
static void restoreTerminal() {
    if (g_inited) {
        tcsetattr(STDIN_FILENO, TCSANOW, &g_oldt);
    }
}

bool pollReleaseKey() {
    if (!inited) {
        // 1) 현재 터미널 설정 저장
        tcgetattr(STDIN_FILENO, &g_oldt);

        // 2) 새 설정 만들기 (old 기반)
        struct termios newt = g_oldt;

        // ICANON 제거 : 엔터 치기 전까지 입력 버퍼링하는 "라인 모드 OFF"
        // ECHO 제거   : 누른 키가 터미널에 찍히는 현상 OFF
        newt.c_lflag &= ~(ICANON | ECHO);   // 한 글자 즉시 입력 + 화면 에코 OFF

        // 3) 터미널에 적용
        tcsetattr(STDIN_FILENO, TCSANOW, &newt);

        // 4) stdin을 non-blocking으로 변경
        int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
        fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);

        // 5) 종료 시 원복 등록
        std::atexit(restoreTerminal);

        g_inited = true;
    }

    // 6) 한 글자 읽기 시도 (없으면 -1 /EAGAIN 나오도 OK)
    char c;
    ssize_t n = read(STDIN_FILENO, &c, 1);

    if (n > 0) {
        if (c == 'r' || c == 'R') return true;
    }
    return false;
}