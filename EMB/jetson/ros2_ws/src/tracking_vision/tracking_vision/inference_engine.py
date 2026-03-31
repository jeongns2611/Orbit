import numpy as np
import logging
from ultralytics import YOLO

class YoloTracker:
    """
    YOLOv8 TensorRT 엔진을 사용하여 객체 검출 및 MOT를 수행하는 모듈
    """
    def __init__(self, model_path: str, tracker_type: str, device: str, half: bool):
        try:
            # 젯슨 GPU 최적화 엔진 로드
            self.model = YOLO(model_path, task='detect')
            self.tracker_type = tracker_type
            self.device = device
            self.half = half
            logging.info(f"Successfully loaded model: {model_path}")
        except Exception as e:
            logging.error(f"Failed to load model: {e}")
            raise

    def process_frame(self, frame: np.ndarray) -> list:
        """
        입력 프레임에 대해 추론 및 트래킹을 수행하고 정제된 결과를 반환
        """
        results = self.model.track(
            source=frame,
            persist=True,
            tracker=self.tracker_type,
            device=self.device,
            half=self.half,
            verbose=False
        )
        return self._parse_results(results[0])

    def _parse_results(self, result) -> list:
        """
        Ultralytics 결과 객체에서 필요한 데이터(ID, BBox, Class)만 추출
        """
        if result.boxes is None or result.boxes.id is None:
            return []
            
        # GPU 데이터를 CPU로 옮겨서 리스트화 (DDS 전송 준비)
        parsed_data = []
        boxes = result.boxes.xyxy.cpu().numpy()
        ids = result.boxes.id.cpu().numpy().astype(int)
        clss = result.boxes.cls.cpu().numpy().astype(int)
        confs = result.boxes.conf.cpu().numpy()

        for box, obj_id, cls, conf in zip(boxes, ids, clss, confs):
            parsed_data.append({
                "id": obj_id,
                "bbox": box.tolist(),  # [x1, y1, x2, y2]
                "class": cls,
                "confidence": float(conf)
            })
        return parsed_data