/* control/drive_state_policy.hpp : 상위 정책 결정 인터페이스 */

#pragma once
#include <string>

#include "../comm/stm_uart.hpp"     // StmRxStatus, StmState
#include "../planner/target_speed_planner.hpp"

std::string resolveDriveState(const StmRxStatus& stm_status,
                            const TargetSpeedPlanner& planner);