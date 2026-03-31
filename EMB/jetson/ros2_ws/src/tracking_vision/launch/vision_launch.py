from launch import LaunchDescription
from launch_ros.actions import Node
import os
from ament_index_python.packages import get_package_share_directory

def generate_launch_description():
    # 패키지 공유 폴더에서 설정 파일 경로 가져오기
    pkg_dir = get_package_share_directory('tracking_vision')
    config_path = os.path.join(pkg_dir, 'config', 'vision_config.yaml')

    return LaunchDescription([
        # 카메라 퍼블리셔 실행
        Node(
            package='tracking_vision',
            executable='camera_node',
            name='camera_node',
            output='screen',
            emulate_tty=True,
        ),
        # 트래킹 노드 실행 (설치된 yaml 설정 로드)
        Node(
            package='tracking_vision',
            executable='tracking_node',
            name='tracking_node',
            parameters=[config_path],
            output='screen',
            emulate_tty=True,
        ),
        # 시각화 노드
        Node(
            package='tracking_vision',
            executable='visualizer_node',
            name='visualizer_node',
            output='screen'
        )
    ])