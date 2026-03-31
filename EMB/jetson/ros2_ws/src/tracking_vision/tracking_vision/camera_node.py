import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2

class CameraNode(Node):
    """
    USB 카메라 영상을 읽어 ROS2 Image 메시지로 퍼블리시하는 노드
    """
    def __init__(self):
        super().__init__('camera_node')
        
        # QoS 프로필 정의
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT, # 최신 데이터 우선
            depth=10
        )

        # 퍼블리셔(publisher) 생성 시 적용
        self.publisher_ = self.create_publisher(
            Image, 
            '/camera/image_raw', 
            qos_profile
        )
    
        # 타이머 설정 (30 FPS 기준 약 0.033초)
        self.timer = self.create_timer(0.033, self.timer_callback)
        
        # 3. 카메라 및 브릿지 초기화
        self.cap = cv2.VideoCapture(0)
        self.bridge = CvBridge()
        
        if not self.cap.isOpened():
            self.get_logger().error("카메라를 열 수 없습니다! /dev/video0 확인 필요")

    def timer_callback(self):
        ret, frame = self.cap.read()
        if ret:
            # OpenCV 이미지를 ROS2 메시지로 변환하여 전송
            img_msg = self.bridge.cv2_to_imgmsg(frame, encoding="bgr8")
            self.publisher_.publish(img_msg)
        else:
            self.get_logger().warn("프레임을 읽어오지 못했습니다.")

    def __del__(self):
        self.cap.release()

def main(args=None):
    rclpy.init(args=args)
    node = CameraNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()