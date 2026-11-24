import math
from typing import List, Dict, Optional, Tuple, NamedTuple

class GestureResult(NamedTuple):
    gesture: Optional[str]      # "P", "F", "V", "T", "L", or None (neutral/uncertain)
    confidence: float           # 0.0 to 1.0
    name: str                   # Human readable name
    finger_states: Dict[str, bool] # {"thumb": bool, "index": bool, ...}
    details: Dict[str, float]   # geometric diagnostics (angles, distances)

class GestureClassifier:
    """
    Robust geometric classifier for MediaPipe 21 hand landmarks:
    - P: Open Palm (all 5 fingers extended)
    - F: Closed Fist (all fingers folded)
    - V: Peace Sign (index & middle extended with V-separation, ring & pinky folded)
    - T: Thumbs Up (thumb extended upward, index-middle-ring-pinky folded)
    - L: L-Shape (thumb & index extended roughly perpendicularly, middle-ring-pinky folded)
    """

    def __init__(self, confidence_threshold: float = 0.70):
        self.confidence_threshold = confidence_threshold

    @staticmethod
    def _dist(p1, p2) -> float:
        """Euclidean distance between two 3D or 2D points"""
        dx = p1[0] - p2[0]
        dy = p1[1] - p2[1]
        dz = (p1[2] - p2[2]) if len(p1) > 2 and len(p2) > 2 else 0.0
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    @staticmethod
    def _vector_angle_deg(v1: Tuple[float, float], v2: Tuple[float, float]) -> float:
        """Angle in degrees between two 2D vectors"""
        dot = v1[0] * v2[0] + v1[1] * v2[1]
        m1 = math.sqrt(v1[0] * v1[0] + v1[1] * v1[1])
        m2 = math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])
        if m1 * m2 < 1e-7:
            return 0.0
        cos_ang = max(-1.0, min(1.0, dot / (m1 * m2)))
        return math.degrees(math.acos(cos_ang))

    def classify(self, landmarks: List[Tuple[float, float, float]]) -> GestureResult:
        """
        landmarks: list of 21 (x, y, z) tuples normalized to [0, 1]
        MediaPipe Landmark Indices:
        0: WRIST
        1-4: THUMB (1: CMC, 2: MCP, 3: IP, 4: TIP)
        5-8: INDEX (5: MCP, 6: PIP, 7: DIP, 8: TIP)
        9-12: MIDDLE (9: MCP, 10: PIP, 11: DIP, 12: TIP)
        13-16: RING (13: MCP, 14: PIP, 15: DIP, 16: TIP)
        17-20: PINKY (17: MCP, 18: PIP, 19: DIP, 20: TIP)
        """
        if not landmarks or len(landmarks) < 21:
            return GestureResult(
                gesture=None, confidence=0.0, name="Searching Hand",
                finger_states={}, details={}
            )

        wrist = landmarks[0]
        # Hand scale reference: distance from wrist (0) to middle MCP (9)
        hand_scale = self._dist(wrist, landmarks[9])
        if hand_scale < 1e-4:
            hand_scale = 1.0

        # Hand primary axis (wrist -> middle MCP)
        axis_x = landmarks[9][0] - wrist[0]
        axis_y = landmarks[9][1] - wrist[1]
        axis_len = math.sqrt(axis_x * axis_x + axis_y * axis_y) or 1.0
        ux = axis_x / axis_len
        uy = axis_y / axis_len

        # Perpendicular normal vector to hand axis
        nx = -uy
        ny = ux

        # Helper to test if a finger (index, middle, ring, pinky) is extended
        def is_finger_extended(mcp_idx: int, pip_idx: int, dip_idx: int, tip_idx: int) -> Tuple[bool, float]:
            mcp = landmarks[mcp_idx]
            pip = landmarks[pip_idx]
            tip = landmarks[tip_idx]

            # In image space, tip extended along hand axis should be farther from wrist than pip
            dist_tip_wrist = self._dist(tip, wrist)
            dist_pip_wrist = self._dist(pip, wrist)
            dist_tip_mcp = self._dist(tip, mcp)

            # Ratio of tip distance compared to pip distance from wrist
            ratio = dist_tip_wrist / max(dist_pip_wrist, 1e-4)

            # Finger is extended if tip is distinctly farther from wrist than PIP
            extended = (dist_tip_wrist > dist_pip_wrist * 1.15) and (dist_tip_mcp > hand_scale * 0.70)
            return extended, ratio

        index_ext, index_ratio = is_finger_extended(5, 6, 7, 8)
        middle_ext, middle_ratio = is_finger_extended(9, 10, 11, 12)
        ring_ext, ring_ratio = is_finger_extended(13, 14, 15, 16)
        pinky_ext, pinky_ratio = is_finger_extended(17, 18, 19, 20)

        # Thumb extension analysis
        # Thumb TIP (4) vs Thumb MCP (2) and Pinky MCP (17)
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        dist_thumb_tip_pinky = self._dist(thumb_tip, landmarks[17])
        dist_thumb_ip_pinky = self._dist(thumb_ip, landmarks[17])
        dist_thumb_tip_wrist = self._dist(thumb_tip, wrist)
        dist_thumb_mcp_wrist = self._dist(thumb_mcp, wrist)

        # Vector from thumb MCP to thumb TIP
        thumb_vec = (thumb_tip[0] - thumb_mcp[0], thumb_tip[1] - thumb_mcp[1])
        index_vec = (landmarks[8][0] - landmarks[5][0], landmarks[8][1] - landmarks[5][1])
        middle_vec = (landmarks[12][0] - landmarks[9][0], landmarks[12][1] - landmarks[9][1])

        # Angle between thumb and index
        thumb_index_angle = self._vector_angle_deg(thumb_vec, index_vec)
        # Angle between index and middle (for V sign)
        index_middle_angle = self._vector_angle_deg(index_vec, middle_vec)

        # General thumb extension: tip is away from palm center and further than IP
        thumb_extended = (dist_thumb_tip_pinky > dist_thumb_ip_pinky * 1.10) and (
            self._dist(thumb_tip, thumb_mcp) > hand_scale * 0.45
        )

        # Thumbs up specific check:
        # In webcam feed, thumb points upward (y is smaller in image coordinates)
        # and tip is well above thumb IP and MCP
        thumb_upward = (thumb_tip[1] < thumb_ip[1] < thumb_mcp[1]) or (
            # If camera is tilted, check projection along hand axis (negative means towards finger tips/upward)
            (thumb_tip[0] - wrist[0]) * ux + (thumb_tip[1] - wrist[1]) * uy < 0
        )
        thumb_stands_out = self._dist(thumb_tip, wrist) > hand_scale * 0.75

        finger_states = {
            "thumb": bool(thumb_extended),
            "index": bool(index_ext),
            "middle": bool(middle_ext),
            "ring": bool(ring_ext),
            "pinky": bool(pinky_ext)
        }

        details = {
            "index_ratio": index_ratio,
            "middle_ratio": middle_ratio,
            "ring_ratio": ring_ratio,
            "pinky_ratio": pinky_ratio,
            "thumb_index_angle": thumb_index_angle,
            "index_middle_angle": index_middle_angle,
            "hand_scale": hand_scale
        }

        detected_gesture: Optional[str] = None
        confidence: float = 0.0
        name: str = "Neutral / Unknown"

        # --- Rule 1: P = Open Palm ---
        # All 5 fingers extended
        if index_ext and middle_ext and ring_ext and pinky_ext and thumb_extended:
            detected_gesture = "P"
            name = "Open Palm"
            # High confidence when all extension ratios are high
            confidence = min(0.98, 0.70 + 0.07 * (index_ratio + middle_ratio + ring_ratio + pinky_ratio - 4.0))

        # --- Rule 2: F = Closed Fist ---
        # All 4 fingers curled tightly, and thumb is not in an extended Thumbs-Up pose
        elif (not index_ext) and (not middle_ext) and (not ring_ext) and (not pinky_ext) and (not (thumb_extended and thumb_upward)):
            detected_gesture = "F"
            name = "Closed Fist"
            confidence = 0.92

        # --- Rule 3: V = Peace Sign ---
        # Index & Middle extended, Ring & Pinky folded, distinct V separation
        elif index_ext and middle_ext and (not ring_ext) and (not pinky_ext):
            # Thumb can be folded over ring/pinky or neutral
            # Index and Middle tips should have sufficient Euclidean separation
            v_sep = self._dist(landmarks[8], landmarks[12]) / hand_scale
            if v_sep > 0.20 or index_middle_angle > 10.0:
                detected_gesture = "V"
                name = "Peace Sign"
                confidence = min(0.96, 0.75 + min(0.20, v_sep * 0.3))

        # --- Rule 4: T = Thumbs Up ---
        # Thumb extended, all other 4 fingers folded into fist
        elif (not index_ext) and (not middle_ext) and (not ring_ext) and (not pinky_ext) and thumb_extended and thumb_upward:
            detected_gesture = "T"
            name = "Thumbs Up"
            confidence = 0.90

        # --- Rule 5: L = L-Shape ---
        # Thumb & Index extended, Middle, Ring, Pinky folded, angle roughly 50° to 135°
        elif index_ext and thumb_extended and (not middle_ext) and (not ring_ext) and (not pinky_ext):
            if 45.0 <= thumb_index_angle <= 140.0:
                detected_gesture = "L"
                name = "L-Shape"
                # Peak confidence around 90 degrees
                angle_dev = abs(thumb_index_angle - 90.0)
                confidence = max(0.72, min(0.95, 0.95 - (angle_dev / 100.0) * 0.25))

        if confidence < self.confidence_threshold or detected_gesture is None:
            detected_gesture = None
            name = "Unrecognized Gesture"
            confidence = 0.0

        return GestureResult(
            gesture=detected_gesture,
            confidence=round(confidence, 3),
            name=name,
            finger_states=finger_states,
            details=details
        )
