cmake_minimum_required(VERSION 3.10)

# 프로젝트 이름
project(rpi_controller)

# C++ 표준
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 헤더 파일 경로
include_directories(
    ${PROJECT_SOURCE_DIR}
    ${PROJECT_SOURCE_DIR}/comm
    ${PROJECT_SOURCE_DIR}/common
	${PROJECT_SOURCE_DIR}/sensor
	${PROJECT_SOURCE_DIR}/planner
    ${PROJECT_SOURCE_DIR}/status
    ${PROJECT_SOURCE_DIR}/control

)

# 실행 파일 생성
add_executable(rpi_controller
    main.cpp
    comm/stm_uart.cpp
	#sensor/sensor_dummy.cpp
    sensor/sensor_mqtt.cpp
	planner/target_speed_planner.cpp
    planner/target_steer_planner.cpp
    status/status_publisher.cpp
    control/drive_state_policy.cpp
)

# ===== 외부 라이브러리 링크 =====
target_link_libraries(rpi_controller
    mosquitto
    jsoncpp
    pthread
)