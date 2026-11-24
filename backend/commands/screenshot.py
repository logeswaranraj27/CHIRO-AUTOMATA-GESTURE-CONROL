import time
from pathlib import Path
from typing import Dict, Any
from PIL import ImageGrab
from backend.config import SCREENSHOTS_DIR
from backend.services.activity_logger import activity_logger

class ScreenshotHandler:
    def __init__(self, output_dir: Path = SCREENSHOTS_DIR):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def execute(self) -> Dict[str, Any]:
        try:
            timestamp = int(time.time() * 1000)
            filename = f"chiro_screenshot_{timestamp}.png"
            file_path = self.output_dir / filename

            # Capture desktop
            img = ImageGrab.grab()
            img.save(str(file_path), "PNG")

            msg = f"Screenshot saved to {filename} ({img.width}x{img.height})."
            activity_logger.log(
                event_type="SCREENSHOT",
                message=msg,
                command="Screenshot",
                details={"filename": filename, "width": img.width, "height": img.height}
            )

            return {
                "status": "success",
                "action": "SCREENSHOT",
                "filename": filename,
                "url": f"/screenshots/{filename}",
                "dimensions": f"{img.width}x{img.height}"
            }
        except Exception as e:
            err = f"Failed to capture screenshot: {e}"
            activity_logger.log(event_type="ERROR", message=err, command="Screenshot")
            return {"status": "error", "action": "SCREENSHOT", "error": err}

