import rclpy
from rclpy.node import Node
from std_msgs.msg import Float32MultiArray
from rclpy.qos import QoSProfile, ReliabilityPolicy
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2

class VisualizerNode(Node):
    def __init__(self):
        super().__init__('visualizer_node')
        self.bridge = CvBridge()

        self.latest_results = []

        # QoS 프로필 정의
        qos_profile = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT, # 최신 이미지 우선 수신
            depth=10
        )

        # 트래킹 좌표 수신
        self.sub_data = self.create_subscription(
            Float32MultiArray,
            '/tracking/results',
            self.data_callback,
            qos_profile
        )

        # 원본 이미지 수신
        self.sub_image = self.create_subscription(
            Image,
            '/camera/image_raw',
            self.image_callback,
            qos_profile
        )

    def data_callback(self, msg):
        self.latest_results = msg.data

    def image_callback(self, msg):
        try:
            # 1. 원본 이미지 가져오기
            frame = self.bridge.imgmsg_to_cv2(msg, "bgr8")
            h, w, _ = frame.shape # 이미지 실제 크기 확인

            # 2. 박스 그리기 로직 (데이터가 있을 때만 실행)
            if len(self.latest_results) > 0:
                for i in range(0, len(self.latest_results), 5):
                    obj_id = int(self.latest_results[i])
                    bbox = self.latest_results[i+1:i+5]
                    
                    # 좌표가 0~1 사이 값일 경우를 대비해 이미지 크기 곱해주기
                    # 만약 이미 픽셀 값이면 이 곱셈은 빼도 됩니다.
                    x1, y1 = int(bbox[0]), int(bbox[1])
                    x2, y2 = int(bbox[2]), int(bbox[3])

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"ID: {obj_id}", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            # 3. [속도 최적화] 화면에 띄울 때만 크기를 줄여서 출력 (X11 부하 감소)
            display_frame = cv2.resize(frame, (320, 240)) # 원하는 크기로 조절
            cv2.imshow("Jetson Real-time Tracking", display_frame)
            cv2.waitKey(1)
            
        except Exception as e:
            self.get_logger().error(f"❌ 시각화 에러: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = VisualizerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        rclpy.shutdown()