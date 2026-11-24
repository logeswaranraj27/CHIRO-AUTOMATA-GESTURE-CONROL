import os
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = BASE_DIR / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

VALID_GESTURES = ["P", "F", "V", "T", "L"]
GESTURE_NAMES = {
    "P": "Open Palm",
    "F": "Closed Fist",
    "V": "Peace Sign",
    "T": "Thumbs Up",
    "L": "L-Shape"
}

class CommandConfig(BaseModel):
    id: str
    name: str
    sequence: List[str]
    description: str
    enabled: bool = True
    action_type: str
    target: Optional[str] = None

class AccessibilitySettings(BaseModel):
    voice_feedback_enabled: bool = True
    speech_rate: float = 1.0
    speech_volume: float = 1.0
    gesture_stability_ms: int = 500
    neutral_interval_ms: int = 300
    inter_gesture_timeout_sec: float = 2.0
    sequence_timeout_sec: float = 10.0
    gesture_confidence_threshold: float = 0.70
    allow_system_lock: bool = False
    whitelisted_app_path: str = "notepad.exe"

DEFAULT_COMMANDS: List[CommandConfig] = [
    CommandConfig(
        id="cmd_sos",
        name="Emergency SOS",
        sequence=["P", "F", "V"],
        description="Triggers emergency simulated alert modal and high-priority voice alarm.",
        enabled=True,
        action_type="EMERGENCY_SOS"
    ),
    CommandConfig(
        id="cmd_read_screen",
        name="Read Screen",
        sequence=["F", "T", "L"],
        description="Reads available clipboard text or active window title aloud via TTS.",
        enabled=True,
        action_type="READ_SCREEN"
    ),
    CommandConfig(
        id="cmd_system_lock",
        name="System Lock",
        sequence=["V", "P", "F"],
        description="Safely locks the Windows workstation (safety switch must be enabled in settings).",
        enabled=True,
        action_type="SYSTEM_LOCK"
    ),
    CommandConfig(
        id="cmd_mute_audio",
        name="Mute Audio",
        sequence=["P", "T", "F"],
        description="Toggles Windows master audio mute.",
        enabled=True,
        action_type="MUTE_AUDIO"
    ),
    CommandConfig(
        id="cmd_volume_up",
        name="Volume Up",
        sequence=["T", "P", "V"],
        description="Increases Windows master audio volume by 10%.",
        enabled=True,
        action_type="VOLUME_UP"
    ),
    CommandConfig(
        id="cmd_volume_down",
        name="Volume Down",
        sequence=["T", "F", "V"],
        description="Decreases Windows master audio volume by 10%.",
        enabled=True,
        action_type="VOLUME_DOWN"
    ),
    CommandConfig(
        id="cmd_screenshot",
        name="Screenshot",
        sequence=["L", "P", "T"],
        description="Captures primary monitor display and saves to screenshots directory.",
        enabled=True,
        action_type="SCREENSHOT"
    ),
    CommandConfig(
        id="cmd_open_app",
        name="Open Application",
        sequence=["V", "T", "L"],
        description="Launches configured whitelisted application (e.g. Notepad, Calculator).",
        enabled=True,
        action_type="OPEN_APPLICATION",
        target="notepad.exe"
    ),
    CommandConfig(
        id="cmd_stop_reading",
        name="Stop Reading",
        sequence=["F", "L", "P"],
        description="Immediately stops active speech synthesis and screen reading.",
        enabled=True,
        action_type="STOP_READING"
    ),
    CommandConfig(
        id="cmd_cancel_op",
        name="Cancel Operation",
        sequence=["L", "F", "P"],
        description="Cancels any pending gesture sequence and resets automata to initial state.",
        enabled=True,
        action_type="CANCEL_OPERATION"
    ),
]

class AppConfig:
    def __init__(self):
        self.commands: List[CommandConfig] = [cmd.model_copy() for cmd in DEFAULT_COMMANDS]
        self.settings: AccessibilitySettings = AccessibilitySettings()

    def get_command_by_id(self, cmd_id: str) -> Optional[CommandConfig]:
        for cmd in self.commands:
            if cmd.id == cmd_id:
                return cmd
        return None

    def reset_to_defaults(self):
        self.commands = [cmd.model_copy() for cmd in DEFAULT_COMMANDS]
        self.settings = AccessibilitySettings()

config = AppConfig()

