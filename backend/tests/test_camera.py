import cv2
import numpy as np
import pytest

from backend.api import routes
from backend.vision.camera import CameraService
from backend.vision.gesture_classifier import GestureResult


def test_browser_camera_processes_uploaded_frames(monkeypatch):
    service = CameraService()
    detected_shapes = []

    def detect(frame):
        detected_shapes.append(frame.shape[:2])
        return None, None, frame.copy()

    monkeypatch.setattr(
        service.hand_detector,
        "detect",
        detect,
    )
    monkeypatch.setattr(
        service.classifier,
        "classify",
        lambda landmarks: GestureResult(
            gesture=None,
            confidence=0.0,
            name="No Hand",
            finger_states={},
            details={},
        ),
    )
    monkeypatch.setattr(
        cv2,
        "VideoCapture",
        lambda *args: pytest.fail("browser camera must not open a server webcam"),
    )
    monkeypatch.setattr(routes, "camera_service", service)

    assert service.start(source="browser")
    success, encoded_frame = cv2.imencode(".jpg", np.zeros((480, 640, 3), dtype=np.uint8))
    assert success

    result = routes.process_camera_frame(encoded_frame.tobytes())

    assert result == {"success": True}
    assert detected_shapes == [(360, 480)]
    assert service.get_status()["frame_count"] == 1
    assert service.get_latest_jpeg().startswith(b"\xff\xd8")
    service.stop()
