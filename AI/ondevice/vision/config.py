import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "assets", "yolov8n.pt")
# 이 경로에 temp_tracker.yaml이 자동으로 생길 겁니다.
TRACKER_CONFIG_PATH = os.path.join(BASE_DIR, "assets", "temp_tracker.yaml")

# 카메라 및 검출
CAMERA_SOURCE = 1
CONFIDENCE = 0.45
CLASS_LIST = [0]

# 트래킹 하이퍼파라미터
TRACK_BUFFER = 300
WITH_REID = True
