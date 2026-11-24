import ctypes
from typing import Dict, Any
from backend.config import config
from backend.services.activity_logger import activity_logger

class SystemControlHandler:
    def __init__(self):
        self._init_audio()

    def _init_audio(self):
        self.audio_available = False
        try:
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            from comtypes import CLSCTX_ALL
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            self.volume_ctrl = ctypes.cast(interface, ctypes.POINTER(IAudioEndpointVolume))
            self.audio_available = True
        except Exception:
            self.volume_ctrl = None
            self.audio_available = False

    def mute_audio(self) -> Dict[str, Any]:
        """Toggles system audio mute"""
        try:
            if self.audio_available and self.volume_ctrl:
                current_mute = self.volume_ctrl.GetMute()
                new_mute = not current_mute
                self.volume_ctrl.SetMute(new_mute, None)
                msg = f"Audio {'muted' if new_mute else 'unmuted'} successfully."
            else:
                # Windows fallback via keyboard virtual key (VK_VOLUME_MUTE = 0xAD)
                ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)
                msg = "Audio mute key simulated."

            activity_logger.log(
                event_type="MUTE_AUDIO",
                message=msg,
                command="Mute Audio"
            )
            return {"status": "success", "action": "MUTE_AUDIO", "message": msg}
        except Exception as e:
            err = f"Failed to toggle audio mute: {e}"
            activity_logger.log(event_type="ERROR", message=err, command="Mute Audio")
            return {"status": "error", "action": "MUTE_AUDIO", "error": err}

    def volume_up(self) -> Dict[str, Any]:
        """Increases system volume by 10%"""
        try:
            if self.audio_available and self.volume_ctrl:
                cur = self.volume_ctrl.GetMasterVolumeLevelScalar()
                new_vol = min(1.0, cur + 0.10)
                self.volume_ctrl.SetMasterVolumeLevelScalar(new_vol, None)
                pct = int(new_vol * 100)
                msg = f"Volume increased to {pct}%."
            else:
                # Fallback: VK_VOLUME_UP = 0xAF
                for _ in range(5):
                    ctypes.windll.user32.keybd_event(0xAF, 0, 0, 0)
                    ctypes.windll.user32.keybd_event(0xAF, 0, 2, 0)
                msg = "Volume increased."

            activity_logger.log(event_type="VOLUME_UP", message=msg, command="Volume Up")
            return {"status": "success", "action": "VOLUME_UP", "message": msg}
        except Exception as e:
            err = f"Failed to increase volume: {e}"
            activity_logger.log(event_type="ERROR", message=err, command="Volume Up")
            return {"status": "error", "action": "VOLUME_UP", "error": err}

    def volume_down(self) -> Dict[str, Any]:
        """Decreases system volume by 10%"""
        try:
            if self.audio_available and self.volume_ctrl:
                cur = self.volume_ctrl.GetMasterVolumeLevelScalar()
                new_vol = max(0.0, cur - 0.10)
                self.volume_ctrl.SetMasterVolumeLevelScalar(new_vol, None)
                pct = int(new_vol * 100)
                msg = f"Volume decreased to {pct}%."
            else:
                # Fallback: VK_VOLUME_DOWN = 0xAE
                for _ in range(5):
                    ctypes.windll.user32.keybd_event(0xAE, 0, 0, 0)
                    ctypes.windll.user32.keybd_event(0xAE, 0, 2, 0)
                msg = "Volume decreased."

            activity_logger.log(event_type="VOLUME_DOWN", message=msg, command="Volume Down")
            return {"status": "success", "action": "VOLUME_DOWN", "message": msg}
        except Exception as e:
            err = f"Failed to decrease volume: {e}"
            activity_logger.log(event_type="ERROR", message=err, command="Volume Down")
            return {"status": "error", "action": "VOLUME_DOWN", "error": err}

    def system_lock(self) -> Dict[str, Any]:
        """
        Locks Windows workstation.
        Safety gate: must be enabled in Accessibility Settings to prevent accidental lockouts during testing.
        """
        if not config.settings.allow_system_lock:
            msg = "System Lock simulated. Enable 'Allow System Lock' in Settings to lock Windows session."
            activity_logger.log(
                event_type="SYSTEM_LOCK_SIMULATED",
                message=msg,
                command="System Lock"
            )
            return {
                "status": "simulated",
                "action": "SYSTEM_LOCK",
                "message": msg,
                "safety_engaged": True
            }

        try:
            activity_logger.log(
                event_type="SYSTEM_LOCK",
                message="Locking Windows workstation via user32.LockWorkStation().",
                command="System Lock"
            )
            ctypes.windll.user32.LockWorkStation()
            return {"status": "success", "action": "SYSTEM_LOCK", "message": "Workstation locked."}
        except Exception as e:
            err = f"Failed to lock workstation: {e}"
            activity_logger.log(event_type="ERROR", message=err, command="System Lock")
            return {"status": "error", "action": "SYSTEM_LOCK", "error": err}

