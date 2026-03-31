/*control/drive_state_policy.cpp*/
#include "drive_state_policy.hpp"

std::string resolveDriveState(const StmRxStatus& stm_status,
                            const TargetSpeedPlanner& planner)
{
    if (stm_status.state == StmState::EMERGENCY)
        return "STOP";
    
    return planner.getStateString();    // TRACKING, HOLD_DECAY, STOP
}