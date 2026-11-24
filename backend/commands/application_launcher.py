import subprocess
from typing import Dict, Any, Optional
from backend.config import config
from backend.services.activity_logger import activity_logger

SAFE_APPLICATIONS = {
    "notepad.exe": ["notepad.exe"],
    "calc.exe": ["calc.exe"],
    "explorer.exe": ["explorer.exe"],
    "chrome.exe": ["chrome.exe"],
    "msedge.exe": ["msedge.exe"]
}

class ApplicationLauncherHandler:
    def execute(self, target_app: Optional[str] = None) -> Dict[str, Any]:
        app_name = (target_app or config.settings.whitelisted_app_path).lower().strip()
        
        # Verify whitelist
        if app_name not in SAFE_APPLICATIONS:
            # Fallback to notepad
            app_name = "notepad.exe"

        args = SAFE_APPLICATIONS[app_name]
        try:
            subprocess.Popen(args, shell=False)
            msg = f"Application '{app_name}' launched."
            activity_logger.log(
                event_type="OPEN_APPLICATION",
                message=msg,
                command="Open Application",
                details={"application": app_name}
            )
            return {"status": "success", "action": "OPEN_APPLICATION", "application": app_name}
        except Exception as e:
            err = f"Failed to launch '{app_name}': {e}"
            activity_logger.log(event_type="ERROR", message=err, command="Open Application")
            return {"status": "error", "action": "OPEN_APPLICATION", "error": err}

