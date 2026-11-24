from typing import Optional, Dict, Any
from backend.config import config

class VoiceManager:
    """Formats and controls non-overlapping speech events dispatched to the frontend"""

    @staticmethod
    def format_speech_payload(text: str, priority: str = "normal") -> Dict[str, Any]:
        return {
            "type": "VOICE_FEEDBACK",
            "text": text,
            "rate": config.settings.speech_rate,
            "volume": config.settings.speech_volume,
            "priority": priority, # "high" (SOS/Errors) or "normal" (Progress)
            "enabled": config.settings.voice_feedback_enabled
        }

