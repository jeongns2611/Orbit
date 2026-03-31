"""
Main execution script for robot control data extraction.
This version uses centralized configuration and direct parameter injection.
"""

import config  # 중앙 설정 모듈 임포트
import cv2
from core.tracker import ImageProcessor
from utils.camera import CameraHandler
from utils.geometry import ControlGeometry


def main() -> None:
    """Assembles modules to run the control data extraction loop."""
    # 1. 초기화: 하드코딩된 경로 대신 config 변수 사용
    cam = CameraHandler(source=config.CAMERA_SOURCE)

    # 이제 tracker_config 인자가 필요 없습니다.
    tracker = ImageProcessor(model_name=config.MODEL_PATH)

    specs = cam.get_specs()
    print(
        f"Control Mode Started: {specs['width']}x{specs['height']} @ {specs['fps']}FPS"
    )

    try:
        while True:
            success, frame = cam.get_frame()
            if not success:
                break

            # 2. 추론 (config 내의 튜닝값이 내부적으로 적용됨)
            results = tracker.get_tracking_results(frame)
            annotated_frame = results[0].plot()

            # 3. 제어 데이터 계산 및 시각화
            if results[0].boxes.id is not None:
                # xywh: [center_x, center_y, width, height]
                boxes = results[0].boxes.xywh.cpu().numpy()
                target_box = boxes[0]  # 첫 번째 타겟 기준

                # 중앙 오프셋 및 크기 비율 계산
                offset_x = ControlGeometry.calculate_offset(
                    target_box[0], specs["width"]
                )
                area_ratio = ControlGeometry.calculate_area_ratio(
                    target_box[2],
                    target_box[3],
                    specs["width"],
                    specs["height"],
                )

                # 터미널 출력 및 화면 표시
                cv2.putText(
                    annotated_frame,
                    f"Offset: {offset_x:.2f}",
                    (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 0, 0),
                    2,
                )
                print(
                    f"Target Found -> Offset: {offset_x:.2f}, Area: {area_ratio:.4f}"
                )

            cv2.imshow("Robot Control Mode (No-YAML)", annotated_frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cam.release()


if __name__ == "__main__":
    main()
