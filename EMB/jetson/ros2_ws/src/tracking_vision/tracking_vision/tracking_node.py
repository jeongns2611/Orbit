import os
import cv2
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
from .inference_engine import YoloTracker
from ament_index_python.packages import get_package_share_directory
from std_msgs.msg import Float32MultiArray

class TrackingNode(Node):
    def __init__(self):
        super().__init__('tracking_node')

        # QoS 프로필 정의
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT, # 속도 우선 모드!
            depth=10
        )

        # Subscription 생성
        self.subscription = self.create_subscription(
            Image,
            '/camera/image_raw',
            self.image_callback,
            qos_profile
        )

        # Publish
        self.data_pub = self.create_publisher(
            Float32MultiArray, 
            '/tracking/results', 
            qos_profile
        )
        
        self.bridge = CvBridge()
        
        # 패키지의 설치(share) 경로
        package_share_dir = get_package_share_directory('tracking_vision')
        
        # 파라미터로 받은 상대 경로를 절대 경로로 변환
        # (기본값이 'models/yolov8n.engine'일 때 share/tracking_vision/models/yolov8n.engine이 됨)
        self.declare_parameter('model_path', 'models/yolov8n.engine')
        relative_path = self.get_parameter('model_path').get_parameter_value().string_value
        full_model_path = os.path.join(package_share_dir, relative_path)
        
        # 엔진 로드
        self.get_logger().info(f"Loading model from: {full_model_path}")
        self.tracker = YoloTracker(
            model_path=full_model_path,
            tracker_type='botsort.yaml',
            device='0',
            half=True
        )

    def image_callback(self, msg):
        
        # self.get_logger().info("🔵 [DEBUG] Image received! Start inference...")
    
        try:
            # ROS2 메시지를 OpenCV 포맷으로 변환
            # self.get_logger().info("⏳ [AI] Starting Inference...")
            
            frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")
            # AI 엔진 실행
            tracking_results = self.tracker.process_frame(frame)

            # 전송할 데이터 포장 (Float32MultiArray)
            data_to_send = []
            for item in tracking_results:
                obj_id = float(item['id'])
                x1, y1, x2, y2 = map(float, item['bbox'])
                data_to_send.extend([obj_id, x1, y1, x2, y2])
                
                self.get_logger().info(f"🎯 [DETECTED] ID: {obj_id} | BBox: {[x1, y1, x2, y2]}")

            # 3. 데이터 퍼블리시
            out_msg = Float32MultiArray()
            out_msg.data = data_to_send
            self.data_pub.publish(out_msg)
    
        except Exception as e:
            self.get_logger().error(f"❌ [ERROR] Callback failed: {e}")
        
        # 결과 로깅
        for item in tracking_results:
            self.get_logger().info(f"ID: {item['id']} | Box: {item['bbox']}")

def main(args=None):
    rclpy.init(args=args)
    node = TrackingNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()
