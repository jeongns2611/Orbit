#!/usr/bin/env python3

import os
import json
from pathlib import Path
from dotenv import load_dotenv

import rclpy
from rclpy.node import Node
from my_robot_interfaces.msg import TargetObject
from rclpy.qos import QoSProfile, ReliabilityPolicy
import paho.mqtt.client as mqtt

def load_env_from_ws_root():
    current_path = Path(__file__).resolve()
    # 상위 폴더로 올라가며 .env를 탐색 (최대 5단계까지)
    for parent in current_path.parents:
        env_file = parent / '.env'
        if env_file.exists():
            return env_file
    return None

class MqttBridgeNode(Node):
    def __init__(self):
        super().__init__('mqtt_bridge_node')

        # QoS 프로필 생성
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            depth=10
        )

        # .env 파일 위치 (절대 경로)
        env_path = load_env_from_ws_root()
        
        if env_path:
            load_dotenv(dotenv_path=env_path)
            self.get_logger().info(f"✅ .env 파일을 찾았습니다: {env_path}")
        else:
            self.get_logger().error(f"❌ .env 파일이 없습니다! 경로를 확인하세요: {env_path}")

        # 1. 환경 변수 로드
        self.mqtt_host = os.getenv('MQTT_HOST')
        self.mqtt_port = int(os.getenv('MQTT_PORT', 8000))
        self.mqtt_user = os.getenv('MQTT_USER')
        self.mqtt_pass = os.getenv('MQTT_PASSWORD')
        
        self.get_logger().info(f"📡 접속 시도 중... Host: {self.mqtt_host}, User: {self.mqtt_user}")

        # 2. MQTT 클라이언트 설정
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.username_pw_set(self.mqtt_user, self.mqtt_pass)

        # self.mqtt_client.on_connect = self.on_connect
        # self.mqtt_client.on_publish = self.on_publish
            
        try:
            self.mqtt_client.connect(self.mqtt_host, int(os.getenv('MQTT_PORT', 8000)))
            self.mqtt_client.loop_start()
        except Exception as e:
            self.get_logger().error(f"❌ 접속 시도 중 예외 발생: {e}")

        # 3. /target_object 구독 (라이다 노드로부터 수신)
        self.subscription = self.create_subscription(
            TargetObject,
            '/target_object',
            self.listener_callback,
            qos_profile)

    def listener_callback(self, msg):
        # 거리, 각도값을 JSON으로 직렬화
        payload = {
            "dist": round(msg.distance, 3),
            "angle": round(msg.angle_deg, 3),
            "detected": round(msg.detected, 3),
        }
        # MQTT 발행
        self.mqtt_client.publish("rpi/lidar/target", json.dumps(payload))
        # self.get_logger().info(f'MQTT 전송 완료 -> Dist: {msg.distance:.2f}m')

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.get_logger().info("✅ MQTT 브로커에 최종 연결되었습니다!")
            self.mqtt_client.subscribe("rpi/lidar/target")
        else:
            self.get_logger().error(f"❌ 연결 실패! 에러 코드: {rc} (인증 오류일 가능성 높음)")

    def on_publish(self, client, userdata, mid):
        self.get_logger().info(f"📤 MQTT 메시지 전송 성공! (mid: {mid})")

    def destroy_node(self):
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
        super().destroy_node()

def main(args=None):
    rclpy.init(args=args)
    node = MqttBridgeNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()