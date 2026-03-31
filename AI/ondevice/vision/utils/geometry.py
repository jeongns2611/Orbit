"""This module provides geometric calculations for robot control."""


class ControlGeometry:
    """Calculates navigation data from bounding box coordinates."""

    @staticmethod
    def calculate_offset(target_center_x: float, screen_width: int) -> float:
        """Calculates normalized x-offset from the screen center (-1.0 to 1.0)."""
        center_x_screen = screen_width / 2
        return (target_center_x - center_x_screen) / center_x_screen

    @staticmethod
    def calculate_area_ratio(
        box_width: float,
        box_height: float,
        screen_width: int,
        screen_height: int,
    ) -> float:
        """Calculates the ratio of the target box area to the total screen area."""
        return (box_width * box_height) / (screen_width * screen_height)
