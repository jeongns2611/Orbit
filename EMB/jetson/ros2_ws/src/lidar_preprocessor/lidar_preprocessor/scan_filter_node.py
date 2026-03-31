#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from tf2_ros import TransformListener, Buffer
import math

class ScanFilterNode(Node):
    def __init__(self):
        super().__init__('scan_filter_node')

        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        
        # QoS 프로필 정의
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE,
            depth=10
        )
        
        # raw 데이터 sub -> refine 데이터 /filtered_scan으로 pub
        self.sub = self.create_subscription(
            LaserScan, 
            '/scan', 
            self.callback, 
            qos_profile
        )
        self.pub = self.create_publisher(
            LaserScan,
            '/filtered_scan',
            qos_profile
        )

        # 카메라 화각 (FOV) range (전방 +- 45도)
        self.declare_parameter('min_angle', -45.0)
        self.declare_parameter('max_angle', 45.0)
        self.declare_parameter('min_dist', 0.1)
        self.declare_parameter('max_dist', 6.0)

        # 파라미터 값 가져오기
        self.min_angle = self.get_parameter('min_angle').get_parameter_value().double_value
        self.max_angle = self.get_parameter('max_angle').get_parameter_value().double_value
        self.min_dist = self.get_parameter('min_dist').get_parameter_value().double_value
        self.max_dist = self.get_parameter('max_dist').get_parameter_value().double_value
    
    def callback(self, msg):
        
        try:
            # base_link와 laser_frame 사이의 TF(변환값) 가져오기
            trans = self.tf_buffer.lookup_transform('base_link', 'laser_frame', rclpy.time.Time())
            # 쿼터니언 -> 오일러 각 (Yaw)로 변환 (calibrration 값 추출)
            q = trans.transform.rotation
            siny_cosp = 2*(q.w * q.z + q.x * q.y)
            cosy_cosp = 1-2*(q.y * q.y + q.z * q.z)
            yaw_correction = math.atan2(siny_cosp, cosy_cosp)
        
        except Exception as e:
            self.get_logger().warn(f'Could not transform: {e}')
            return

        filtered_msg = msg
        new_ranges = list(msg.ranges)

        for i, dist in enumerate(new_ranges):
            # 라이다 기준 각도 (radian)
            raw_angle_rad = msg.angle_min + (i*msg.angle_increment)
            # TF 보정값(Yaw) 적용
            corrected_angle_rad = raw_angle_rad + yaw_correction
            # 각도 -pi ~ pi 정규화
            corrected_angle_rad = math.atan2(math.sin(corrected_angle_rad), math.cos(corrected_angle_rad))
            # radian -> degree
            angle = math.degrees(corrected_angle_rad)

            # 범위 밖 데이터는 무한대(inf) 처리
            if not (self.min_angle <= angle <= self.max_angle and self.min_dist <= dist <= self.max_dist):
                new_ranges[i] = float('inf')
        
        filtered_msg.ranges = new_ranges
        self.pub.publish(filtered_msg)

def main():
    rclpy.init()
    node = ScanFilterNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()