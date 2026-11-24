import cv2
import time
import threading
import numpy as np
from typing import Optional, Tuple, Dict, Any, Callable
from .hand_detector import HandDetector
from .gesture_classifier import GestureClassifier, GestureResult

class CameraService:
    def __init__(self, camera_index: int = 0, confidence_threshold: float = 0.70):
        self.camera_index = camera_index
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

        self.hand_detector = HandDetector()
        self.classifier = GestureClassifier(confidence_threshold=confidence_threshold)

        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_annotated_frame: Optional[np.ndarray] = None
        self.latest_jpeg: Optional[bytes] = None
        self.latest_gesture: GestureResult = GestureResult(
            gesture=None, confidence=0.0, name="Camera Off", finger_states={}, details={}
        )
        self.latest_landmarks: Optional[list] = None
        self.fps: float = 0.0
        self.frame_count: int = 0
        self.error_message: Optional[str] = None
        self.capture_source: Optional[str] = None
        self.frame_lock = threading.Lock()
        self.last_frame_time = 0.0
        
        # Callback invoked on every classified frame: fn(gesture_result, landmarks)
        self.on_gesture_callback: Optional[Callable[[GestureResult, Optional[list]], None]] = None

    def set_confidence_threshold(self, threshold: float):
        self.classifier.confidence_threshold = threshold

    def start(self, source: str = "local") -> bool:
        with self.lock:
            if self.is_running:
                if self.capture_source == source:
                    return True
                self.error_message = "Camera is already active from another source."
                return False

            if source == "browser":
                self.capture_source = source
                self.is_running = True
                self.fps = 0.0
                self.last_frame_time = time.monotonic()
                self.error_message = None
                self.latest_gesture = GestureResult(
                    gesture=None, confidence=0.0, name="Searching Hand", finger_states={}, details={}
                )
                return True
            if source != "local":
                self.error_message = f"Unsupported camera source: {source}"
                return False

            # Attempt to open camera
            self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
            if not self.cap or not self.cap.isOpened():
                # Fallback to default backend
                self.cap = cv2.VideoCapture(self.camera_index)
                
            if not self.cap or not self.cap.isOpened():
                self.error_message = f"Webcam at index {self.camera_index} could not be opened. Check connection and permissions."
                self.is_running = False
                return False

            self.capture_source = source
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)

            self.is_running = True
            self.fps = 0.0
            self.last_frame_time = time.monotonic()
            self.error_message = None
            self.latest_gesture = GestureResult(
                gesture=None, confidence=0.0, name="Searching Hand", finger_states={}, details={}
            )
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            return True

    def stop(self):
        worker_thread = None
        with self.lock:
            self.is_running = False
            self.fps = 0.0
            self.latest_raw_frame = None
            self.latest_annotated_frame = None
            self.latest_jpeg = None
            self.latest_gesture = GestureResult(
                gesture=None, confidence=0.0, name="Camera Off", finger_states={}, details={}
            )
            self.latest_landmarks = None
            if self.cap and self.cap.isOpened():
                self.cap.release()
                self.cap = None
            self.capture_source = None
            if self.thread and self.thread.is_alive():
                worker_thread = self.thread
                self.thread = None
        if worker_thread:
            try:
                worker_thread.join(timeout=0.8)
            except Exception:
                pass

    def _generate_fallback_frame(self, text: str) -> np.ndarray:
        """Creates a stylized placeholder frame when camera is not feeding"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Gradient background
        for y in range(480):
            frame[y, :] = (int(15 + y * 0.02), int(20 + y * 0.03), int(30 + y * 0.05))
        
        cv2.putText(frame, "CHIRO-AUTOMATA VISION", (170, 220), cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 220, 255), 2)
        cv2.putText(frame, text, (150, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)
        return frame

    def _capture_loop(self):
        while self.is_running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(0.05)
                continue

            success, frame = self.cap.read()
            if not success or frame is None:
                time.sleep(0.02)
                continue

            self._process_frame(frame)

            # Pace loop to ~30 FPS
            time.sleep(0.015)

    def process_browser_frame(self, frame: np.ndarray) -> bool:
        if not self.is_running or self.capture_source != "browser":
            return False
        with self.frame_lock:
            if not self.is_running or self.capture_source != "browser":
                return False
            height, width = frame.shape[:2]
            scale = min(1.0, 480 / width, 360 / height)
            if scale < 1.0:
                frame = cv2.resize(
                    frame,
                    (int(width * scale), int(height * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            self._process_frame(frame)
        return True

    def get_latest_stream_frame(self) -> Tuple[int, bool, Optional[bytes]]:
        with self.lock:
            return self.frame_count, self.is_running, self.latest_jpeg

    def _process_frame(self, frame: np.ndarray) -> None:
        # Mirror frame horizontally for natural selfie interaction
        frame = cv2.flip(frame, 1)
        landmarks, handedness, annotated = self.hand_detector.detect(frame)
        gesture_res = self.classifier.classify(landmarks)

        # Instantaneous / smoothed FPS calculation
        now = time.monotonic()
        dt = now - self.last_frame_time
        self.last_frame_time = now
        if dt > 0:
            instant_fps = min(60.0, 1.0 / dt)
            if self.fps <= 0.1:
                self.fps = instant_fps
            else:
                self.fps = 0.85 * self.fps + 0.15 * instant_fps

        # Draw HUD on top left of annotated frame
        h, w, _ = annotated.shape

        # Semi-transparent HUD overlay
        hud = annotated.copy()
        cv2.rectangle(hud, (10, 10), (280, 100), (10, 15, 25), -1)
        cv2.addWeighted(hud, 0.75, annotated, 0.25, 0, annotated)
        cv2.rectangle(annotated, (10, 10), (280, 100), (0, 200, 255), 1)

        status_str = f"GESTURE: {gesture_res.gesture or 'None'} ({gesture_res.name})"
        conf_str = f"CONF: {int(gesture_res.confidence * 100)}% | FPS: {self.fps:.1f}"
        hand_str = f"HAND: {handedness or 'None'}"

        cv2.putText(annotated, status_str, (20, 38), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(annotated, conf_str, (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1, cv2.LINE_AA)
        cv2.putText(annotated, hand_str, (20, 88), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 220, 160), 1, cv2.LINE_AA)

        # Encode to JPEG
        ret, buffer = cv2.imencode('.jpg', annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        jpeg_bytes = buffer.tobytes() if ret else None

        with self.lock:
            self.latest_raw_frame = frame
            self.latest_annotated_frame = annotated
            self.latest_jpeg = jpeg_bytes
            self.latest_gesture = gesture_res
            self.latest_landmarks = landmarks
            self.frame_count += 1

        if self.on_gesture_callback:
            try:
                self.on_gesture_callback(gesture_res, landmarks)
            except Exception:
                pass

    def get_latest_jpeg(self) -> Optional[bytes]:
        with self.lock:
            if self.latest_jpeg:
                return self.latest_jpeg
            # Return placeholder frame
            placeholder = self._generate_fallback_frame(
                self.error_message or "Camera Standby (Click 'Start Camera')"
            )
            ret, buf = cv2.imencode('.jpg', placeholder, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            return buf.tobytes() if ret else None

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "is_running": self.is_running,
                "fps": round(self.fps, 1),
                "frame_count": self.frame_count,
                "error": self.error_message,
                "current_gesture": {
                    "symbol": self.latest_gesture.gesture,
                    "name": self.latest_gesture.name,
                    "confidence": self.latest_gesture.confidence,
                    "finger_states": self.latest_gesture.finger_states
                }
            }

