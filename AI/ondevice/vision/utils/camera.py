"""This module provides a unified interface for camera operations."""

from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np


class CameraHandler:
    """Handles video capture and camera-related utility functions."""

    def __init__(self, source: int = 0) -> None:
        """Initializes the CameraHandler with a video source."""
        self.cap: cv2.VideoCapture = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open video source: {source}")

    def get_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Captures a single frame from the camera."""
        return self.cap.read()

    def get_specs(self) -> Dict[str, Any]:
        """Returns the camera resolution and preset FPS."""
        return {
            "width": int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": self.cap.get(cv2.CAP_PROP_FPS),
        }

    def release(self) -> None:
        """Releases the camera resources."""
        self.cap.release()
        cv2.destroyAllWindows()
