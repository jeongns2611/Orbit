"""
This module dynamically generates the tracker config to satisfy
Ultralytics Re-ID requirements.
"""

import os
from typing import Any

import config
import yaml
from ultralytics import YOLO


class ImageProcessor:
    """Core tracking engine that ensures all mandatory parameters are present."""

    def __init__(self, model_name: str) -> None:
        self.model: YOLO = YOLO(model_name)
        # 실행 시점에 config.py의 값을 바탕으로 완벽한 YAML을 생성
        self._generate_tracker_config()

    def _generate_tracker_config(self) -> None:
        """Creates a temp yaml with the mandatory 'model' field for Re-ID."""
        tracker_data = {
            "tracker_type": "botsort",
            "track_high_thresh": 0.3,
            "track_low_thresh": 0.1,
            "new_track_thresh": 0.4,
            "track_buffer": 1000,
            "match_thresh": 0.9,
            "gmc_method": "orb",
            "proximity_thresh": 0.5,
            "appearance_thresh": 0.15,
            "with_reid": True,
            "fuse_score": True,
            "model": "auto",
        }

        os.makedirs(os.path.dirname(config.TRACKER_CONFIG_PATH), exist_ok=True)
        with open(config.TRACKER_CONFIG_PATH, "w", encoding="utf-8") as f:
            yaml.dump(tracker_data, f)

    def get_tracking_results(self, frame: Any) -> Any:
        return self.model.track(
            source=frame,
            persist=True,
            tracker=config.TRACKER_CONFIG_PATH,
            conf=config.CONFIDENCE,
            classes=config.CLASS_LIST,
            show=False,
        )
