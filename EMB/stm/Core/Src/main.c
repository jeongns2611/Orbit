/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "tim.h"
#include "usart.h"
#include "gpio.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

/* USER CODE BEGIN PV */

// RPM 기반 정지 유지 임계값 추가
#define RPM_STOP_HOLD_THRESHOLD   12.0f   // 이 RPM 이하면 '완전 정지'
#define RPM_RELEASE_THRESHOLD     20.0f   // 이 이상부터 다시 구동 허용
//static bool motor_hold_stop = true;

// ==== Motor start grace time ====
uint32_t motor_start_tick = 0;   // target_rpm > 0 이 된 최초 시각 (시동)

// === Servo Parameters(rad → PWM) ===
#define SERVO_HW_MIN		1000		// 좌측 물리 한계
#define SERVO_HW_MAX		2000		// 우측 물리 한계
#define SERVO_CENTER		1500		// 센터 값
#define SERVO_LEFT_US		1200		// 실사용 좌측 물리 값
#define SERVO_RIGHT_US		1800		// 실사용 우측 물리 값
#define SERVO_DEADBAND_US	3			// 서보모터 불감대 (3µ) => RPi에서 이미 5µ로 제한했기에 좀 더 관대하게 해도 됨

static uint16_t last_servo_pulse = SERVO_CENTER;

// ==== Vehicle Parameters(Speed → RPM) ====
#define WHEEL_RADIUS_M		0.03f		// 바퀴 반지름(m)
#define TWO_PI				6.2831853f	// 2π

// ===== RPM → PWM LUT =====
typedef struct {
	float rpm;
	uint16_t pwm;
} rpm_pwm_lut_t;

const rpm_pwm_lut_t rpm_pwm_lut[] = {
	    {  80.0f,  48 },
	    { 130.0f,  58 },
	    { 170.0f,  68 },
	    { 270.0f,  80 },
	    { 380.0f,  90 },
	    { 470.0f, 100 }
};

#define LUT_SIZE (sizeof(rpm_pwm_lut) / sizeof(rpm_pwm_lut[0]))

// ==== LUT Sweep Config ====
#define TEST_PWM_START 30
#define TEST_PWM_END   200		// 최대로 측정할 PWM 선정
#define TEST_PWM_STEP  10

#define STABLE_TIME_MS 2000		// 안정화 대기 시간 (2초)
#define SAMPLE_TIME_MS 3000		// 평균 계산 시간 (3초)

uint16_t test_pwm = TEST_PWM_START;
uint32_t sweep_tick = 0;
uint32_t sample_tick = 0;
uint32_t rpm_sum = 0;
uint32_t rpm_cnt = 0;
uint8_t sweep_state = 0;
// 0 : PWM 설정, 1 : 안정화 대기, 2 : RPM 평균 수집
// ===========================

// ==== UART RX ====
#define UART_RX_BUF_SIZE 64

uint8_t uart_rx_byte;				// 1byte 수신
char uart_rx_buf[UART_RX_BUF_SIZE];	// 문자열 버퍼
uint8_t uart_rx_idx = 0;			// 수신 인덱스
volatile uint8_t uart_rx_done = 0;	// 한 패킷 수신

// ==== Encoder CNT 누적 개수 ====
#define RPM_ACCUM_N  3			// CNT 누적 개수 (3 = 300ms)

// ===== Encoder spec =====
#define ENCODER_PPR   46        // pulses per revolution
#define SAMPLE_TIME  0.1f       // 100 ms
#define LPF_ALPHA	 0.3f		// RPM's Low Pass Filter 계수 (0~1)

// ==== Encoder safety ====
#define ENCODER_MIN_CNT 2
//#define STUCK_LIMIT		10		// 10 cycles = 1sec
#define STUCK_LIMIT		20		// 10 cycles = 1sec (시동 테스트)

// ==== PWM 최소 상수 정의 ====
#define PWM_MAX 	  99
#define PWM_MIN		  0
#define PWM_START_MIN 40			// 기동 최소 PWM (핵심)
#define PWM_STEP_MAX  10			// Soft-start 제한

#define PWM_START_MIN_FWD 40
#define PWM_START_MIN_REV 50

// =========STEP B : 후진 + 방향 전환 FSM ==================================
// ===== Direction FSM =====
typedef enum {
    DIR_FWD = 0,
    DIR_REV = 1
} dir_t;

// ====== 차의 행동 상태(FSM) =======
typedef enum {
    DRIVE_STOP = 0,
    DRIVE_RUN,
    DRIVE_RAMP_DOWN,
    DRIVE_DIR_SWITCH
} drive_state_t;

// 현재/목표 방향
static dir_t cur_dir = DIR_FWD;          // 현재 적용된 방향
static dir_t req_dir = DIR_FWD;          // 목표 방향

// 주행 FSM 상태
static drive_state_t drive_state = DRIVE_STOP;

#define DIR_SWITCH_HOLD_MS   200         // 방향 전환 시 모터 완전 정지 유지 시간(200ms 권장)
static uint32_t dir_switch_tick = 0;

// ===== Hysteresis thresholds (rpm) =====
#define RPM_OPEN_TO_CLOSED   80.0f
#define RPM_CLOSED_TO_OPEN   60.0f
#define RPM_OPENLOOP_MAX     70.0f        // 기존 값 유지해도 되고, 히스테리시스로 더 안정화됨

// ===== PWM Noise floor (무부하 삐삐 구간 차단용, 선택) =====
#define PWM_NOISE_MIN        45           // 무부하에서 삐삐 심하면 45~55로 조정

// =========STEP B=======================================================


// ==== STEP 2 : Control Params ====
//#define K_FF            	0.55f   // Feedforward gain (PWM per RPM) ← 1단계 로그 기반
#define K_P_INC         	0.15f   // 증분형 P gain (PWM per RPM)
#define RPM_DEADBAND    	3.0f    // ±3 RPM 이내면 PWM 보정 안 함
#define RPM_START_THRESHOLD 5.0f	// 모터가 정지 상태라고 판단하는 RPM 임계값

// ==== PI Controller ====
#define P_LIMIT  	15.0f		//헌팅 방지용 P 보정 상한 Limit
#define I_LIMIT		500.0f		// anti-windup Limit

// ==== PI 제어 함수 설계 변수 ====
float Kp         = 0.8f;	// 비례 이득(초기값)
float Ki         = 0.2f;	// 적분 이득(초기값) --> Ki = 0이면 P 제어
float error      = 0.0f;
float error_prev = 0.0f;	// 이전 샘플 오차로 D(미분 항)항 계산에 사용됨 --> 현재 PI제어이므로 필요X
float error_i 	 = 0.0f;    // 적분항

// ===== Encoder variables =====
int32_t cnt_now  = 0;		// 현재 증가량
int32_t cnt_prev = 0;		// 이전 증가량
int32_t delta_cnt = 0;		// 변화량

// ===== Speed =====
float rpm_raw  = 0.0f;			// Raw RPM 값
float rpm_filt = 0.0f;			// 필터 적용한 RPM

// ===== Target Data =====
volatile float target_speed_mps = 0.0f;	// UART로 받은 값
volatile float target_rpm = 0.0f;		// STM 내부 제어용
volatile float target_steer = 0.0f;		// UART로 받은 값(-1.0 ~ +1.0)

// ===== Fail-safe (Speed Command Watchdog) =====
//#define SPEED_CMD_TIMEOUT_MS 2000   		// 2000ms (튜닝 가능)
#define SPEED_CMD_TIMEOUT_MS 700   		    // 2000ms -> 700ms로 Watchdog 단축
volatile uint32_t last_speed_tick = 0;	    // 마지막 SPD 수신 시각

// ==== dCNT 추적 변수 ====
int32_t delta_buf[RPM_ACCUM_N] = {0};
uint8_t delta_idx = 0;
int32_t delta_sum = 0;

// ===== State (속도 제어 방식(Open/Closed)) =====
typedef enum {
    MOTOR_STOP = 0,
    MOTOR_OPENLOOP,
    MOTOR_CLOSEDLOOP
} motor_state_t;

motor_state_t motor_state = MOTOR_STOP;

// ==== PWM 변수 ====
uint16_t pwm_cmd  = 0;
uint16_t pwm_prev = 0;

// ==== Safety ====
uint16_t encoder_stuck_cnt = 0;	// 엔코더 안전 장치 변수

// ==== Time ====
uint32_t last_ctrl_tick = 0;			// DC 모터 제어 주기
volatile uint32_t last_steer_tick = 0;	// 서보 모터 제어 주기

// ==== UART buffer ====
char uart_buf[100];

// UART 기반 Servo Debug 변수
volatile float dbg_steer_cmd = 0.0f;
volatile uint16_t dbg_servo_pulse = SERVO_CENTER;


// UART 송신(TX) 주기 변수
static uint32_t last_stat_tx_tick = 0;
static uint32_t stat_tx_period_ms = 500;	// 500ms 마다 상태 송신

// STM 상태(NORMAL, EMERGENCY)와 이벤트(NONE, BUMP) 관리를 위한 변수
typedef enum {
	STM_STATE_NORMAL = 0,
	STM_STATE_EMERGENCY
} stm_state_t;

typedef enum {
	EVT_NONE = 0,
	EVT_BUMP
} stm_event_t;

volatile stm_state_t stm_state = STM_STATE_NORMAL;
volatile stm_event_t last_evt  = EVT_NONE;

static uint8_t bumper_prev = 1;		// Pull-up 기준 (미눌림 = 1, 눌림 = 0)
static uint32_t last_bump_tick = 0;	// 디바운스용
#define BUMP_DEBOUNCE_MS		50  // 50ms 디바운싱

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
/* USER CODE BEGIN PFP */

// UART 상태 송신 로직 함수 선언부
void STM_StatusTx_Task(void);


/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

// 범퍼 읽기 함수 (미눌림 = 1, 눌림 = 0)
static inline uint8_t Bumper_Read(void)
{
	return HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_12);	// PB12
}

// Fail-Safe 처리 태스크
void Bumper_Failsafe_Task(void)
{
	uint8_t now = Bumper_Read();		// 스위치 값(안눌림=1, 눌림=0)
	uint32_t now_ms = HAL_GetTick();

	// 디바운싱
	if (now != bumper_prev) {
		if (now_ms - last_bump_tick < BUMP_DEBOUNCE_MS) {
			return;		// 채터링 무시
		}

		last_bump_tick = now_ms;

		// Falling edge : 1 -> 0 (눌림)
		if (bumper_prev == 1 && now == 0) {
			// 이벤트 송신
			const char* evt = "EVT:BUMP\n";
			HAL_UART_Transmit(&huart1, (uint8_t*)evt, strlen(evt), 50);			// 송신
			HAL_UART_Transmit(&huart2, (uint8_t*)"[DBG] EVT:BUMP\n", 15, 50);	// 디버거

			// 상태 래치
			stm_state = STM_STATE_EMERGENCY;
		}
		// Rising edge : 0 -> 1 (떼짐)
		else if (bumper_prev == 0 && now == 1) {
			const char* evt = "EVT:NONE\n";
			HAL_UART_Transmit(&huart1, (uint8_t*)evt, strlen(evt), 50);
			HAL_UART_Transmit(&huart2, (uint8_t*)"[DBG] EVT:NONE\n", 15, 50);
		}

		bumper_prev = now;
	}
}

// steer → PWM 변환 함수
void Servo_UpdateFromSteer(float steer)
{
	HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13); // LED 토글

	// 1. 입력 범위 제한
	if (steer >  1.0f) steer =  1.0f;
	if (steer < -1.0f) steer = -1.0f;

	// 2. steer → pulse (µs)
	float pulse_f;
	if (steer >= 0.0f) {
		pulse_f = SERVO_CENTER + steer * (SERVO_RIGHT_US - SERVO_CENTER);
	}
	else {
		pulse_f = SERVO_CENTER + steer * (SERVO_CENTER - SERVO_LEFT_US);
	}

	int32_t pulse = (int32_t)lroundf(pulse_f);

	// 3. HW 한계 보호
	if (pulse < SERVO_HW_MIN) pulse = SERVO_HW_MIN;
	if (pulse > SERVO_HW_MAX) pulse = SERVO_HW_MAX;

	// 4. Deadband(불감대) 처리
	if (abs(pulse - (int32_t)last_servo_pulse) >= SERVO_DEADBAND_US)
	{
		__HAL_TIM_SET_COMPARE(&htim4, TIM_CHANNEL_1, (uint16_t)pulse);
		last_servo_pulse = (uint16_t)pulse;
	}

	// 5. Debug용
	dbg_steer_cmd = steer;
	dbg_servo_pulse = last_servo_pulse;
}

// Speed → RPM 변환 함수
float SpeedToRPM(float speed_mps)
{
	// speed_ms : m/s (RPi에서 받은 목표 속도)
	if (speed_mps == 0.0f) return 0.0f;

	// 부호에 따른 전진/후진
    float sign = (speed_mps > 0.0f) ? 1.0f : -1.0f;
    float sp = fabsf(speed_mps);

    // 바퀴 회전수(RPM)
	// * 60.0f : (rev/s)*60 = rev/min (RPM) => 분당 RPM 측정을 위한 상수
	float wheel_rpm = (sp / (TWO_PI * WHEEL_RADIUS_M)) * 60.0f;

	return sign * wheel_rpm;
}

// STM 상태 UART 송신 로직
void STM_StatusTx_Task(void)
{
	if (HAL_GetTick() - last_stat_tx_tick < stat_tx_period_ms)
		return;

	last_stat_tx_tick = HAL_GetTick();

	// stm_state 값에 따라 EMERGENCY/NORMAL 분기
	const char* st = (stm_state == STM_STATE_EMERGENCY) ? "STAT:EMERGENCY\n"
														: "STAT:NORMAL\n";
	// RPi 송신 (huart1)
	HAL_UART_Transmit(&huart1, (uint8_t*)st, strlen(st), 50);

	// PC 디버그 로그 (huart2)
	int m = snprintf(uart_buf, sizeof(uart_buf), "[DBG] TX->RPi: %s", st);
	HAL_UART_Transmit(&huart2, (uint8_t*)uart_buf, m, 50);
}

void UART_Receive_Parser(void)
{
    if (!uart_rx_done) return;
    uart_rx_done = 0;

    /* ================= SPD ================= */
    if (strncmp(uart_rx_buf, "SPD:", 4) == 0)
    {
        char *endp;
        float speed_mps = strtof(&uart_rx_buf[4], &endp);

        /* 1) 파싱 실패 방어 */
        if (endp == &uart_rx_buf[4]) return; // 숫자 아니면 return

        /* 2) 속도 범위 제한 (후진 포함) */
        if (speed_mps >  10.0f) speed_mps =  10.0f;
        if (speed_mps < -10.0f) speed_mps = -10.0f;

        /* 3) Dead-zone 처리 (정지 안정화 핵심) */
        if (fabsf(speed_mps) < 0.02f) {   // 2cm/s 이하
            speed_mps = 0.0f;
            motor_start_tick = 0;		  // 시동 리셋
        }

        /* 4) 값 반영 */
        target_speed_mps = speed_mps;
        target_rpm = SpeedToRPM(speed_mps);   // 부호 포함 RPM

        /* 5) 0이 아닐때만 Watchdog 관리 */
        if (fabsf(speed_mps) > 0.02f) {
        	last_speed_tick = HAL_GetTick();
        }

        /* 6) 시동 타이밍 관리 */
        if (fabsf(speed_mps) > 0.02f && motor_start_tick == 0) {
        	motor_start_tick = HAL_GetTick();
        }
    }

    /* ================= STR ================= */
    else if (strncmp(uart_rx_buf, "STR:", 4) == 0)
    {
        char *endp;
        float steer = strtof(&uart_rx_buf[4], &endp);

        if (endp == &uart_rx_buf[4]) {
            return;
        }

        /* 범위 제한 */
        if (steer >  1.2f) steer =  1.2f;
        if (steer < -1.2f) steer = -1.2f;

        target_steer = steer;
        last_steer_tick = HAL_GetTick();
    }
}

// RPM 계산 함수
void Encoder_UpdateRPM(void)
{
    cnt_now = (int32_t)__HAL_TIM_GET_COUNTER(&htim2);	// 1. 현재 엔코더 카운트
    delta_cnt = cnt_now - cnt_prev;						// 2. 변화량 계산
    cnt_prev = cnt_now;									// 3. 이전 값 갱신

    // 4. 누적 버퍼 처리
    delta_sum -= delta_buf[delta_idx];
    delta_buf[delta_idx] = delta_cnt;
    delta_sum += delta_cnt;

    delta_idx = (delta_idx + 1) % RPM_ACCUM_N;

    // 5. 누적된 delta_cnt 기준으로 RPM 계산
    float total_time = SAMPLE_TIME * RPM_ACCUM_N;
    rpm_raw = ((float)delta_sum / ENCODER_PPR) * (60.0f / total_time);

    rpm_filt = LPF_ALPHA * rpm_raw + (1.0f - LPF_ALPHA) * rpm_filt;		// 5. Low Pass Filter 적용(현재 RC카의 RPM 값)
}

uint16_t LUT_Feedforward(float target_rpm)
{
    // ★ FIX 1: 저속 기동 구간 보강 (핵심)
    if (target_rpm > 0.0f && target_rpm < 60.0f)
    {
        //return PWM_START_MIN;   // ★ FIX: 저속은 무조건 기동 PWM 제공
        return PWM_START_MIN_FWD;
    }

    if (target_rpm <= 0.0f)
        return 0;

    if (target_rpm <= rpm_pwm_lut[0].rpm)
        return rpm_pwm_lut[0].pwm;

    if (target_rpm >= rpm_pwm_lut[LUT_SIZE - 1].rpm)
        return rpm_pwm_lut[LUT_SIZE - 1].pwm;

    for (int i = 0; i < LUT_SIZE - 1; i++)
    {
        float rpm1 = rpm_pwm_lut[i].rpm;
        float rpm2 = rpm_pwm_lut[i + 1].rpm;

        if (target_rpm >= rpm1 && target_rpm <= rpm2)
        {
            float pwm1 = rpm_pwm_lut[i].pwm;
            float pwm2 = rpm_pwm_lut[i + 1].pwm;

            float ratio = (target_rpm - rpm1) / (rpm2 - rpm1);
            return (uint16_t)(pwm1 + ratio * (pwm2 - pwm1));
        }
    }

    return rpm_pwm_lut[LUT_SIZE - 1].pwm;
}

float Incremental_P(float target, float current)
{
    float error = target - current;

    if (fabsf(error) <= RPM_DEADBAND)
        return 0.0f;

    float p = K_P_INC * error;

    if (p >  P_LIMIT) p =  P_LIMIT;
    if (p < -P_LIMIT) p = -P_LIMIT;

    return p;
}

// 방향 제어 함수
// 전진(IN1=1, IN2=0)
void Motor_Forward(void)
{
	  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_SET);	// IN1 : 1
	  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_1, GPIO_PIN_RESET); // IN2 : 0
}

// 후진 함수 (IN1=0, IN2=1)
void Motor_Backward(void)
{
	  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET); // IN1 : 0
	  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_1, GPIO_PIN_SET);	// IN2 : 1
}

// 정지 함수
void Motor_Stop(void)
{
	// PWM Duty 값 0으로 설정 -> 모터에 인가되는 평균 전압 = 0 -> 소프트 정지(coast stop)
	// 즉, Breake 기능 X, 자연 감속 기능 O
	__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
}

// PWM 제어(속도) : 0 ~ 999
void Motor_SetDuty(uint16_t duty)
{
	// 하드웨어 안전 장치 : PWM Duty 값을 0 ~ 999 범위로 제한
	  if (duty > PWM_MAX) duty = PWM_MAX;
	  __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, duty);
}

// 서보모터 제어 테스트 함수
void Servo_SetPulse(uint16_t us)
{
	if (us < 1000) us = 1000;
	if (us > 2000) us = 2000;

	__HAL_TIM_SET_COMPARE(&htim4, TIM_CHANNEL_1, us);
}

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART2_UART_Init();
  MX_TIM3_Init();
  MX_TIM2_Init();
  MX_USART1_UART_Init();
  MX_TIM4_Init();
  /* USER CODE BEGIN 2 */

  // UART 수신 활성화
  HAL_UART_Receive_IT(&huart1, &uart_rx_byte, 1);

  // DC모터의 PWM TIM 활성화
  HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);

  // 서보모터의 PWM TIM 활성화
  HAL_TIM_PWM_Start(&htim4, TIM_CHANNEL_1);

  Servo_SetPulse(1500);	// 중립
  HAL_Delay(500);         // 서보 안정 시간

  // Encoder TIM 활성화
  HAL_TIM_Encoder_Start(&htim2, TIM_CHANNEL_ALL);

  Motor_Forward();
  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
	  // Motor_SetDuty(300) : CCR = 300을 의미 -> PWM 듀티 30%
	  // PWM Duty Cycle : 전압 인가하는 시간 비율

	  // ==== [A] UART 수신 처리 (non-blocking) ====
	  UART_Receive_Parser();

	  // ==== [B] 최우선 Fail-Safe ====
	  Bumper_Failsafe_Task();
	  if (stm_state == STM_STATE_EMERGENCY) {
		  Motor_SetDuty(0);
		  // Servo_SetPulse(SERVO_CENTER); // 선택
		  STM_StatusTx_Task();
		  continue;			// RPi 명령 무시
	  }

	  /* ==== [C] Servo decision Layer ==== */
	  float steer_cmd = target_steer;

	  // [C-1] Servo scheduling : 언제 서보 PWM을 갱신할 것 인가?
	  static uint32_t last_servo_tick = 0;
	  if (HAL_GetTick() - last_servo_tick >= 20)	// 20ms(50Hz) 고정 제어 주기
	  {
		  last_servo_tick = HAL_GetTick();
		  Servo_UpdateFromSteer(steer_cmd);			// Servo 업데이트
	  }

	  // [B-3] Servo Debugging
	  static uint32_t last_servo_dbg_tick = 0;
	  if (HAL_GetTick() - last_servo_dbg_tick >= 100)
	  {
	      last_servo_dbg_tick = HAL_GetTick();
	  }
	  /* =================================== */

	  // [D] 100ms(20Hz) 고정 제어 주기
	  if (HAL_GetTick() - last_ctrl_tick >= 50)
	  {
		  last_ctrl_tick = HAL_GetTick();

		  // [D-1] Fail-safe
		  if (HAL_GetTick() - last_speed_tick > SPEED_CMD_TIMEOUT_MS) {
			  target_speed_mps = 0.0f;
			  target_rpm = 0.0f;
			  motor_start_tick = 0;		// 시동 상태 리셋

			  pwm_cmd = 0;
			  pwm_prev = 0;

			  Motor_SetDuty(0);
			  drive_state = DRIVE_STOP;
			  motor_state = MOTOR_STOP;

			  continue;
		  }

		  // [D-2] 목표 RPM 부호 분리
		  float cmd_rpm_signed = target_rpm;	// ±RPM
		  float cmd_rpm		   = fabsf(cmd_rpm_signed);
		  req_dir = (cmd_rpm_signed >= 0.0f) ? DIR_FWD : DIR_REV;

		  // [D-3] Drive FSM Transition
		  switch(drive_state)
		  {
		  	  case DRIVE_STOP:
		  		  if (cmd_rpm > 0.0f) {
		  	          cur_dir = req_dir;     // 바로 방향 반영
		  	          drive_state = DRIVE_RUN;
		  		  }
		  		  break;

		  	  case DRIVE_RUN:
		  		  if (cmd_rpm <= 0.0f) {
		  			  drive_state = DRIVE_STOP;
		  		  }
		  		  else if (req_dir != cur_dir) {
		  			  drive_state = DRIVE_RAMP_DOWN;
		  		  }
		  		  break;

		  	  case DRIVE_RAMP_DOWN:
		  		  if (pwm_prev == 0) {
		  			  drive_state = DRIVE_DIR_SWITCH;
		  			  dir_switch_tick = HAL_GetTick();
		  		  }
		  		  break;

		  	  case DRIVE_DIR_SWITCH:
		  		  if (HAL_GetTick() - dir_switch_tick >= DIR_SWITCH_HOLD_MS) {
		  			  cur_dir = req_dir;
		  			  drive_state = (cmd_rpm > 0.0f) ? DRIVE_RUN : DRIVE_STOP;
		  		  }
		  		  break;
		  }

		  // [D-4] Drive FSM Action
		  if (drive_state == DRIVE_STOP) {
			  Motor_SetDuty(0);
			  pwm_cmd = 0;
			  pwm_prev = 0;
			  motor_state = MOTOR_STOP;
		  }
		  else if (drive_state == DRIVE_RAMP_DOWN) {
			  int32_t p = (int32_t)pwm_prev - PWM_STEP_MAX;
			  if (p < 0) p = 0;
			  pwm_cmd = (uint16_t)p;
			  Motor_SetDuty(pwm_cmd);
			  pwm_prev = pwm_cmd;
			  motor_state = MOTOR_STOP;
		  }
		  else if (drive_state == DRIVE_DIR_SWITCH) {
			  Motor_SetDuty(0);
			  pwm_cmd = 0;
			  pwm_prev = 0;
			  motor_state = MOTOR_STOP;
		  }
		  else { // DRIVE_RUN

			  // 방향 적용
			  if (cur_dir == DIR_FWD) Motor_Forward();
			  else					  Motor_Backward();

			  // [D-5] motor_state 결정
			  static bool closed = false;
			  if (!closed) {
				  if (cmd_rpm >= RPM_OPEN_TO_CLOSED) closed = true;
			  } else {
				  if (cmd_rpm <= RPM_CLOSED_TO_OPEN) closed = false;
			  }

			  motor_state = closed ? MOTOR_CLOSEDLOOP
					  	  	  	   : MOTOR_OPENLOOP;

			  // [D-6] motor_state Action
			  if (motor_state == MOTOR_OPENLOOP) {

				  if (cur_dir == DIR_FWD) pwm_cmd = PWM_START_MIN_FWD;
				  else pwm_cmd = PWM_START_MIN_REV;

				  Motor_SetDuty(pwm_cmd);
				  pwm_prev = pwm_cmd;
			  }
			  else {	// MOTOR_CLOSEDLOOP
				  Encoder_UpdateRPM();

				  uint16_t pwm_ff = LUT_Feedforward(cmd_rpm);
				  float pwm_p = Incremental_P(cmd_rpm, rpm_filt);

				  int32_t pwm_calc = (int32_t)(pwm_ff + pwm_p);

				  if (pwm_calc > pwm_prev + PWM_STEP_MAX)
					  pwm_calc = pwm_prev + PWM_STEP_MAX;
				  else if (pwm_calc < pwm_prev - PWM_STEP_MAX)
					  pwm_calc = pwm_prev - PWM_STEP_MAX;

				  if (pwm_calc > PWM_MAX) pwm_calc = PWM_MAX;
				  if (pwm_calc < 0) pwm_calc = 0;

				  pwm_cmd = (uint16_t)pwm_calc;
				  Motor_SetDuty(pwm_cmd);
				  pwm_prev = pwm_cmd;
			  }
		  }

		  // [D-7] Debug
		  int len = snprintf(uart_buf, sizeof(uart_buf),
		      "[STM] drive=%d motor=%d dir=%d T_RPM=%.1f C_RPM=%.1f PWM=%d\r\n",
		      drive_state, motor_state, cur_dir,
		      target_rpm, rpm_filt, pwm_cmd);

		  HAL_UART_Transmit(&huart2, (uint8_t*)uart_buf, len, 100);
	  }

	  // STM 상태 UART 송신
	  STM_StatusTx_Task();

  }	// while문 끝

  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE2);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI;
  RCC_OscInitStruct.PLL.PLLM = 16;
  RCC_OscInitStruct.PLL.PLLN = 336;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV4;
  RCC_OscInitStruct.PLL.PLLQ = 7;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
}

/* USER CODE BEGIN 4 */

// ==== UART 수신 콜백 함수 ====
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
	if (huart->Instance == USART1)
	{
		char c = (char)uart_rx_byte;

		if (uart_rx_byte == '\n')		// 패킷 종료
		{
			uart_rx_buf[uart_rx_idx] = '\0';
			uart_rx_idx = 0;
			uart_rx_done = 1;
		}
		else
		{
			if (uart_rx_idx < UART_RX_BUF_SIZE - 1)
			{
				uart_rx_buf[uart_rx_idx++] = c;
			} else {
				// overflow : 버퍼 리셋
				uart_rx_idx = 0;

			}

		}

		// target_rpm 갱신
		HAL_UART_Receive_IT(&huart1, &uart_rx_byte, 1);
	}
}

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
