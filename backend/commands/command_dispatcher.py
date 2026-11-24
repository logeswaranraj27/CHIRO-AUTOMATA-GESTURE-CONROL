from typing import Dict, Any, Optional
from .sos import EmergencySOSHandler
from .screen_reader import ScreenReaderHandler
from .system_control import SystemControlHandler
from .screenshot import ScreenshotHandler
from .application_launcher import ApplicationLauncherHandler
from backend.services.activity_logger import activity_logger

class CommandDispatcher:
    def __init__(self):
        self.sos_handler = EmergencySOSHandler()
        self.screen_reader = ScreenReaderHandler()
        self.system_control = SystemControlHandler()
        self.screenshot_handler = ScreenshotHandler()
        self.app_launcher = ApplicationLauncherHandler()

    def dispatch(self, action_type: str, target: Optional[str] = None) -> Dict[str, Any]:
        """
        Dispatches an action to its specific handler.
        """
        if action_type == "EMERGENCY_SOS":
            return self.sos_handler.execute()
        elif action_type == "READ_SCREEN":
            return self.screen_reader.execute()
        elif action_type == "SYSTEM_LOCK":
            return self.system_control.system_lock()
        elif action_type == "MUTE_AUDIO":
            return self.system_control.mute_audio()
        elif action_type == "VOLUME_UP":
            return self.system_control.volume_up()
        elif action_type == "VOLUME_DOWN":
            return self.system_control.volume_down()
        elif action_type == "SCREENSHOT":
            return self.screenshot_handler.execute()
        elif action_type == "OPEN_APPLICATION":
            return self.app_launcher.execute(target)
        elif action_type == "STOP_READING":
            return self.screen_reader.stop()
        elif action_type == "CANCEL_OPERATION":
            activity_logger.log(
                event_type="CANCEL_OPERATION",
                message="Operation cancelled by user sequence.",
                command="Cancel Operation"
            )
            return {"status": "success", "action": "CANCEL_OPERATION", "message": "Operation cancelled."}
        else:
            return {"status": "ignored", "action": action_type}

dispatcher = CommandDispatcher()

