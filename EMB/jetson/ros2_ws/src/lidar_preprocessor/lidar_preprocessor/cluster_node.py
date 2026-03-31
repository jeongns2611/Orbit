#!/usr/bin/env python3

import math

import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from my_robot_interfaces.msg import TargetObject
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Point
import paho.mqtt.client as mqtt
from pathlib import Path

class LidarClusterNode(Node):
    def __init__(self):
        super().__init__('lidar_cluster_node')

        # ROS DDS
        # QoS 프로필 정의
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE,
            depth=10
        )

        # /filtered_scan sub
        self.subscription = self.create_subscription(
            LaserScan,
            '/filtered_scan',
            self.scan_callback,
            qos_profile,
        )

        # 객체 중심 좌표 pub
        self.publisher = self.create_publisher(
            TargetObject, 
            '/target_object',
            qos_profile,
        )

        # 파라미터 선언 (default)
        self.declare_parameter('cluster_dist_threshold', 0.25)
        self.declare_parameter('min_cluster_size', 3)

        # 파라미터 값 읽어오기
        self.dist_threshold = self.get_parameter('cluster_dist_threshold').value
        self.min_size = self.get_parameter('min_cluster_size').value

    def scan_callback(self, msg):
        # 파라미터 서버로부터 최신 설정값 동기화
        self.dist_threshold = self.get_parameter('cluster_dist_threshold').value
        self.min_size = self.get_parameter('min_cluster_size').value

        points = []
        for i, dist in enumerate(msg.ranges):
            if dist == float('inf') or dist <= 0.1: # 너무 가깝거나 먼 것은 제외
                continue
            
            angle = msg.angle_min + (i * msg.angle_increment)
            # 극좌표 -> 직교 좌표 (x, y) 변환
            x = dist * math.cos(angle)
            y = dist * math.sin(angle)
            points.append([x, y])

        if not points:
            return
        
        # 유클리드 클러스터링 알고리즘
        clusters = []
        current_cluster = [points[0]]
        for i in range(1, len(points)): # 임계값 이하의 거리 값는 갖는 point들 clustering
            d = math.sqrt((points[i][0] - points[i-1][0])**2 + (points[i][1] - points[i-1][1])**2)
            
            if d < self.dist_threshold:
                current_cluster.append(points[i])
            else:
                if len(current_cluster) >= self.min_size:
                    clusters.append(current_cluster)
                current_cluster = [points[i]]
        
        if len(current_cluster) >= self.min_size:
            clusters.append(current_cluster)
                    
        target_msg = TargetObject()

        # 가장 가까운 덩어리(객체) 찾기
        if clusters:
            closest_cluster = min(clusters, key=lambda c: sum(math.sqrt(p[0]**2 + p[1]**2) for p in c)/len(c))
            
            # 중심점 계산
            avg_x = sum(p[0] for p in closest_cluster) / len(closest_cluster)
            avg_y = sum(p[1] for p in closest_cluster) / len(closest_cluster)
            
            # 거리와 각도 계산
            # distance: 로봇 중심으로부터 직선 거리
            distance_val = math.sqrt(avg_x**2 + avg_y**2)
            # angle: 로봇 정면(0도) 기준 각도 (degree)
            angle_rad = math.atan2(avg_y, avg_x)

            # 메시지 담기
            target_msg.distance = distance_val
            target_msg.angle_deg = angle_rad
            target_msg.detected = 1.0 # 객체 있음
            
            self.get_logger().info(f'Target -> Dist: {target_msg.distance:.2f}m, Offset: {target_msg.angle_deg:.2f}rad')
        
        else:
            target_msg.distance = 0.0
            target_msg.angle_deg = 0.0
            target_msg.detected = 0.0 # 객체 없음

        # self.publisher.publish(target_msg)
        self.publisher.publish(target_msg)

def main():
    rclpy.init()
    node = LidarClusterNode()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
