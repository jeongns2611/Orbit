"""Evaluation script for MOT performance using centralized configuration."""

import config
import cv2
from core.tracker import ImageProcessor
from utils.camera import CameraHandler


def main() -> None:
    """Runs a visualization loop to test Re-ID and Max Age performance."""
    cam = CameraHandler(source=config.CAMERA_SOURCE)
    # 모델 경로만 넘겨주면 됩니다.
    tracker = ImageProcessor(model_name=config.MODEL_PATH)

    specs = cam.get_specs()
    print(f"Evaluation started at {specs['fps']} FPS")
    print(f"Tracking Buffer: {config.TRACK_BUFFER} frames")

    try:
        while True:
            success, frame = cam.get_frame()
            if not success:
                break

            results = tracker.get_tracking_results(frame)
            annotated_frame = results[0].plot()

            cv2.imshow(
                "MOT Performance Evaluation (No-YAML Mode)", annotated_frame
            )
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cam.release()


if __name__ == "__main__":
    main()
