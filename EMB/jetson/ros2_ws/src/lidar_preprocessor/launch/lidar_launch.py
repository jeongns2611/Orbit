import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node
from launch_ros.actions import LifecycleNode

def generate_launch_description():
    # Config 파일 경로 설정
    config_path = os.path.join(
        get_package_share_directory('lidar_preprocessor'),
        'config',
        'params.yaml'
    )

    # ydlidar package의 parameter
    ydlidar_config = os.path.join(
        get_package_share_directory('ydlidar_ros2_driver'),
        'params', 'ydlidar.yaml'
    )

    return LaunchDescription([
        # LiDAR 드라이버 노드 (yblidar)
        LifecycleNode(
            package='ydlidar_ros2_driver',
            executable='ydlidar_ros2_driver_node',
            name='ydlidar_ros2_driver_node',
            output='screen',
            emulate_tty=True,
            parameters=[ydlidar_config], # 원본 YAML 파일 그대로 사용
            namespace='/',
        ),
        
        # 정적 TF 브로드캐스터 (Cali 자동화)
        Node(
            package='tf2_ros',
            executable='static_transform_publisher',
            name='static_tf_pub_laser',
            arguments=[
                '0',            # 1. X축 이동 (Forward/Backward): base_link와 라이다 사이의 앞뒤 거리 (m단위)
                '0',            # 2. Y축 이동 (Left/Right): base_link와 라이다 사이의 좌우 거리 (m단위)
                '0',            # 3. Z축 이동 (Up/Down): base_link와 라이다 사이의 높이 차이 (m단위)
                '3.14159',      # 4. Yaw (Z축 회전): 평면상에서의 회전. 벨트를 뒤로 보내기 위해 180도 회전
                '0',            # 5. Pitch (Y축 회전): 앞뒤로 기울어짐 정도 (보통 0)
                '3.14159',      # 6. Roll (X축 회전): 좌우 반전을 해결하기 위해 상하를 뒤집음 (180도)
                'base_link',    # 7. 부모 프레임 (Parent Frame): 기준이 되는 좌표계 (로봇 중심)
                'laser_frame'   # 8. 자식 프레임 (Child Frame): 보정할 대상이 되는 좌표계 (라이다 센서)
            ]
        ),

        # 전처리 노드 (min/max_degree/dist는 config 파일에서 불러옴)
        Node(
            package='lidar_preprocessor',
            executable='scan_filter_node',
            name='scan_filter_node',
            parameters=[config_path]
        ),

        # Cluster 노드
        Node(
            package='lidar_preprocessor',
            executable='cluster_node',
            name='cluster_node',
            output='screen'
        ),

        # MQTT 브릿지 노드
        # /target_object 토픽을 구독하여 외부 MQTT 브로커로 전송
        Node(
            package='lidar_preprocessor',
            executable='mqtt_bridge_node',
            name='mqtt_bridge_node',
            output='screen',      # 로그가 터미널에 보이게 설정
            emulate_tty=True      # 컬러 로그 활성화
        ),
    ])