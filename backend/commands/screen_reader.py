import ctypes
from typing import Dict, Any, Optional
from backend.services.activity_logger import activity_logger

class ScreenReaderHandler:
    def __init__(self):
        self.is_reading = False

    def _get_active_window_title(self) -> str:
        """Retrieves title of the foreground Windows application window"""
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buff = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
            return buff.value or "Active Desktop Window"
        except Exception:
            return "Active Desktop Window"

    def _get_clipboard_text(self) -> Optional[str]:
        """Safely inspects Windows clipboard for readable plain text"""
        try:
            import win32clipboard  # optional if available
            win32clipboard.OpenClipboard()
            text = win32clipboard.GetClipboardData()
            win32clipboard.CloseClipboard()
            return str(text) if text else None
        except Exception:
            return None

    def execute(self) -> Dict[str, Any]:
        self.is_reading = True
        window_title = self._get_active_window_title()
        clip_text = self._get_clipboard_text()

        if clip_text and len(clip_text.strip()) > 0:
            content = f"Reading clipboard: {clip_text[:250]}"
        else:
            content = f"Active window: {window_title}. Screen content ready for assistive reading."

        activity_logger.log(
            event_type="READ_SCREEN",
            message=f"Screen reader invoked. Content: '{content[:80]}...'",
            command="Read Screen"
        )

        return {
            "status": "success",
            "action": "READ_SCREEN",
            "text_to_read": content,
            "is_active": True
        }

    def stop(self) -> Dict[str, Any]:
        self.is_reading = False
        activity_logger.log(
            event_type="STOP_READING",
            message="Screen reader stopped immediately.",
            command="Stop Reading"
        )
        return {
            "status": "success",
            "action": "STOP_READING",
            "is_active": False
        }

