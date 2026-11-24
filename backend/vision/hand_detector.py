import cv2
import numpy as np
import sys
import time
import unittest.mock
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any

# Guard against PortAudio / sounddevice C-extension crash on Windows headless/sandbox
if "sounddevice" not in sys.modules:
    sys.modules["sounddevice"] = unittest.mock.MagicMock()

from mediapipe import Image, ImageFormat
from mediapipe.tasks.python import vision, BaseOptions

# Hand Landmark Connection pairs (21 points)
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
    (0, 5), (5, 6), (6, 7), (7, 8),        # Index
    (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
    (9, 13), (13, 14), (14, 15), (15, 16), # Ring
    (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
    (0, 17)                                 # Palm base
]

class HandDetector:
    def __init__(self, model_path: Optional[str] = None, num_hands: int = 1):
        if model_path is None:
            model_path = str(Path(__file__).resolve().parent / "models" / "hand_landmarker.task")
        
        self.model_path = model_path
        self.num_hands = num_hands
        self._last_timestamp_ms = -1
        
        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=self.model_path),
            running_mode=vision.RunningMode.VIDEO,
            num_hands=self.num_hands,
            min_hand_detection_confidence=0.55,
            min_hand_presence_confidence=0.55,
            min_tracking_confidence=0.50
        )
        self.landmarker = vision.HandLandmarker.create_from_options(options)

    def detect(self, bgr_frame: np.ndarray) -> Tuple[Optional[List[Tuple[float, float, float]]], Optional[str], np.ndarray]:
        """
        Processes a BGR OpenCV frame.
        Returns:
            landmarks: List of 21 (x, y, z) normalized coords, or None
            handedness: "Left" / "Right", or None
            annotated_frame: BGR frame with visual HUD overlays
        """
        if bgr_frame is None or bgr_frame.size == 0:
            return None, None, bgr_frame

        h, w, c = bgr_frame.shape
        rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        mp_image = Image(image_format=ImageFormat.SRGB, data=rgb_frame)

        timestamp_ms = time.monotonic_ns() // 1_000_000
        timestamp_ms = max(timestamp_ms, self._last_timestamp_ms + 1)
        self._last_timestamp_ms = timestamp_ms
        result = self.landmarker.detect_for_video(mp_image, timestamp_ms)
        annotated = bgr_frame.copy()

        if not result.hand_landmarks:
            return None, None, annotated

        # Get first/dominant hand
        hand_landmarks = result.hand_landmarks[0]
        handedness_str = "Right"
        if result.handedness and len(result.handedness) > 0 and len(result.handedness[0]) > 0:
            handedness_str = result.handedness[0][0].category_name

        coords: List[Tuple[float, float, float]] = []
        pixel_pts: List[Tuple[int, int]] = []

        for lm in hand_landmarks:
            coords.append((float(lm.x), float(lm.y), float(lm.z)))
            px = int(lm.x * w)
            py = int(lm.y * h)
            pixel_pts.append((px, py))

        # Modern Assistive HUD styling for hand skeleton
        # 1. Draw glowing connections
        for start_idx, end_idx in HAND_CONNECTIONS:
            p1 = pixel_pts[start_idx]
            p2 = pixel_pts[end_idx]
            # Outer glow
            cv2.line(annotated, p1, p2, (30, 144, 255), 3, cv2.LINE_AA)
            # Inner bright line
            cv2.line(annotated, p1, p2, (255, 230, 0), 1, cv2.LINE_AA)

        # 2. Draw landmarks
        for i, pt in enumerate(pixel_pts):
            # Fingertips (4, 8, 12, 16, 20) highlighted in vivid cyan/magenta
            if i in [4, 8, 12, 16, 20]:
                cv2.circle(annotated, pt, 7, (0, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(annotated, pt, 9, (255, 100, 0), 1, cv2.LINE_AA)
            elif i == 0: # Wrist
                cv2.circle(annotated, pt, 6, (0, 165, 255), -1, cv2.LINE_AA)
            else:
                cv2.circle(annotated, pt, 4, (0, 255, 128), -1, cv2.LINE_AA)

        return coords, handedness_str, annotated

    def close(self):
        if hasattr(self, "landmarker") and self.landmarker:
            self.landmarker.close()
