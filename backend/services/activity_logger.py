import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class LogEntry(BaseModel):
    id: int
    timestamp: float
    time_str: str
    event_type: str
    gesture: Optional[str] = None
    state: Optional[str] = None
    command: Optional[str] = None
    message: str
    details: Dict[str, Any] = {}

class ActivityLogger:
    def __init__(self, max_entries: int = 200):
        self.max_entries = max_entries
        self.entries: List[LogEntry] = []
        self._counter: int = 1

    def log(self, event_type: str, message: str, gesture: Optional[str] = None,
            state: Optional[str] = None, command: Optional[str] = None,
            details: Optional[Dict[str, Any]] = None) -> LogEntry:
        now = time.time()
        time_str = time.strftime("%H:%M:%S", time.localtime(now))
        entry = LogEntry(
            id=self._counter,
            timestamp=now,
            time_str=time_str,
            event_type=event_type,
            gesture=gesture,
            state=state,
            command=command,
            message=message,
            details=details or {}
        )
        self._counter += 1
        self.entries.append(entry)
        if len(self.entries) > self.max_entries:
            self.entries.pop(0)
        return entry

    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        return [e.model_dump() for e in self.entries[-limit:]]

    def clear(self):
        self.entries.clear()

activity_logger = ActivityLogger()

