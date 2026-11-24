import time
import threading
from typing import Optional, List, Dict, Any, Callable
from pydantic import BaseModel
from backend.config import config, GESTURE_NAMES
from .mealy_machine import MealyMachine, AutomataOutput
from backend.vision.gesture_classifier import GestureResult

class EngineEvent(BaseModel):
    event_type: str  # "STABILITY_PROGRESS", "GESTURE_ACCEPTED", "TRANSITION", "COMMAND_FIRED", "TIMEOUT", "RESET", "ERROR"
    timestamp: float
    current_state: str
    symbol: Optional[str] = None
    gesture_name: Optional[str] = None
    voice_feedback: Optional[str] = None
    action: Optional[str] = None
    command_name: Optional[str] = None
    sequence_progress: List[str] = []
    details: Dict[str, Any] = {}

class AutomataStateManager:
    """
    Coordinates timing, stability filtering, neutral intervals, and timeouts
    over the formal Mealy Machine.
    """

    def __init__(self, mealy_machine: MealyMachine):
        self.machine = mealy_machine
        self.lock = threading.Lock()

        # Timing states
        self.candidate_symbol: Optional[str] = None
        self.candidate_start_time: float = 0.0

        self.last_accepted_symbol: Optional[str] = None
        self.last_accepted_time: float = 0.0
        self.sequence_start_time: Optional[float] = None

        self.in_neutral_cooldown: bool = False
        self.neutral_start_time: float = 0.0

        self.active_sequence: List[str] = []

        # Event subscribers
        self.listeners: List[Callable[[EngineEvent], None]] = []

    def add_listener(self, listener: Callable[[EngineEvent], None]):
        self.listeners.append(listener)

    def _emit(self, event: EngineEvent):
        for listener in self.listeners:
            try:
                listener(event)
            except Exception:
                pass

    def check_timeouts(self, now: Optional[float] = None):
        """Called periodically (e.g. from timer or camera loop) to check timeout expirations"""
        with self.lock:
            if now is None:
                now = time.time()

            # Timeouts only apply if we are NOT in idle q0
            if self.machine.current_state != self.machine.initial_state:
                # Do not time out if user is currently holding a candidate gesture
                if self.candidate_symbol is not None:
                    return

                # 1. Overall sequence timeout (e.g. 12s)
                if self.sequence_start_time and (now - self.sequence_start_time > config.settings.sequence_timeout_sec):
                    self._handle_timeout(now, "Sequence overall time limit exceeded.")
                    return

                # 2. Inter-gesture timeout (e.g. 3.5s since last accepted gesture)
                if self.last_accepted_time and (now - self.last_accepted_time > config.settings.inter_gesture_timeout_sec):
                    self._handle_timeout(now, "Sequence timed out between gestures.")
                    return

    def _handle_timeout(self, now: float, reason: str):
        self.machine.reset()
        self.active_sequence.clear()
        self.sequence_start_time = None
        self.last_accepted_symbol = None
        self.candidate_symbol = None
        self.in_neutral_cooldown = False

        event = EngineEvent(
            event_type="TIMEOUT",
            timestamp=now,
            current_state=self.machine.current_state,
            voice_feedback="Sequence timed out.",
            sequence_progress=[],
            details={"reason": reason}
        )
        self._emit(event)

    def process_gesture_observation(self, result: GestureResult, now: Optional[float] = None):
        """
        Called on every frame (~30 FPS) with the raw classified gesture.
        Applies:
        1. Neutral interval detection
        2. Stability duration threshold
        3. Mealy Machine execution
        """
        with self.lock:
            if now is None:
                now = time.time()

            observed_symbol = result.gesture  # "P", "F", "V", "T", "L", or None

            # Check timeouts first
            if self.machine.current_state != self.machine.initial_state:
                if self.candidate_symbol is None:
                    if self.sequence_start_time and (now - self.sequence_start_time > config.settings.sequence_timeout_sec):
                        self._handle_timeout(now, "Sequence timed out.")
                        return
                    if self.last_accepted_time and (now - self.last_accepted_time > config.settings.inter_gesture_timeout_sec):
                        self._handle_timeout(now, "Inter-gesture timeout.")
                        return

            # Check Neutral cooldown
            if self.in_neutral_cooldown:
                # If observed symbol is None (hand relaxed/neutral), count neutral time
                if observed_symbol is None:
                    if self.neutral_start_time == 0.0:
                        self.neutral_start_time = now
                    elif (now - self.neutral_start_time) * 1000.0 >= config.settings.neutral_interval_ms:
                        # Neutral interval satisfied!
                        self.in_neutral_cooldown = False
                        self.neutral_start_time = 0.0
                    return
                else:
                    # User is showing a gesture
                    if observed_symbol != self.last_accepted_symbol:
                        # Direct transition to a new gesture satisfies neutral cooldown immediately
                        self.in_neutral_cooldown = False
                        self.neutral_start_time = 0.0
                        self.candidate_symbol = observed_symbol
                        self.candidate_start_time = now
                        return
                    else:
                        # Still holding the old gesture; keep waiting for release
                        self.neutral_start_time = 0.0
                        return

            # If no gesture is observed, reset candidate
            if observed_symbol is None:
                self.candidate_symbol = None
                self.candidate_start_time = 0.0
                return

            # Gesture candidate tracking for stability
            if observed_symbol != self.candidate_symbol:
                self.candidate_symbol = observed_symbol
                self.candidate_start_time = now
                return

            # Same candidate held: check if stability duration met (e.g. 500 ms)
            elapsed_ms = (now - self.candidate_start_time) * 1000.0
            stability_required_ms = config.settings.gesture_stability_ms

            if elapsed_ms < stability_required_ms:
                # Still building stability
                return

            # Stability achieved!
            symbol_to_accept = self.candidate_symbol
            # Reset candidate tracking so we don't immediately fire on next frame
            self.candidate_symbol = None
            self.candidate_start_time = 0.0

            # Execute Mealy transition!
            output: AutomataOutput = self.machine.step(symbol_to_accept)

            self.last_accepted_symbol = symbol_to_accept
            self.last_accepted_time = now
            self.in_neutral_cooldown = True
            self.neutral_start_time = 0.0

            if not output.is_self_loop:
                self.active_sequence.append(symbol_to_accept)

            if len(self.active_sequence) == 1 and self.machine.current_state != self.machine.initial_state:
                self.sequence_start_time = now

            sym_name = GESTURE_NAMES.get(symbol_to_accept, symbol_to_accept)

            completed_sequence = list(self.active_sequence)
            # Determine event type
            if output.is_terminal:
                event_type = "COMMAND_FIRED"
                # Sequence complete, reset active sequence
                self.active_sequence.clear()
                self.sequence_start_time = None
                self.last_accepted_symbol = None
            elif output.is_error:
                event_type = "ERROR"
                # Auto-recover cleanly from dead state: clear sequence and reset to q0
                self.active_sequence.clear()
                self.sequence_start_time = None
                self.last_accepted_symbol = None
                self.candidate_symbol = None
                self.machine.reset()
            elif output.is_self_loop:
                event_type = "SELF_LOOP"
            else:
                event_type = "TRANSITION"

            event = EngineEvent(
                event_type=event_type,
                timestamp=now,
                current_state=self.machine.current_state,
                symbol=symbol_to_accept,
                gesture_name=sym_name,
                voice_feedback=output.voice_feedback,
                action=output.action,
                command_name=output.command_name,
                sequence_progress=list(self.active_sequence) if not output.is_terminal else completed_sequence,
                details={
                    "is_self_loop": output.is_self_loop,
                    "is_terminal": output.is_terminal,
                    "is_error": output.is_error,
                    "is_intermediate": output.is_intermediate,
                    "completed_sequence": completed_sequence if output.is_terminal else None
                }
            )
            self._emit(event)

    def process_manual_symbol(self, symbol: str) -> EngineEvent:
        """
        Processes a manual gesture symbol input through the authoritative Mealy Machine,
        updating active sequence, emitting engine events, and triggering commands.
        """
        with self.lock:
            now = time.time()
            output: AutomataOutput = self.machine.step(symbol)

            self.last_accepted_symbol = symbol
            self.last_accepted_time = now
            self.in_neutral_cooldown = False
            self.candidate_symbol = None

            if not output.is_self_loop:
                self.active_sequence.append(symbol)

            if len(self.active_sequence) == 1 and self.machine.current_state != self.machine.initial_state:
                self.sequence_start_time = now

            sym_name = GESTURE_NAMES.get(symbol, symbol)

            completed_sequence = list(self.active_sequence)
            if output.is_terminal:
                event_type = "COMMAND_FIRED"
                self.active_sequence.clear()
                self.sequence_start_time = None
                self.last_accepted_symbol = None
            elif output.is_error:
                event_type = "ERROR"
                # Auto-recover cleanly from dead state: clear sequence and reset to q0
                self.active_sequence.clear()
                self.sequence_start_time = None
                self.last_accepted_symbol = None
                self.candidate_symbol = None
                self.machine.reset()
            elif output.is_self_loop:
                event_type = "SELF_LOOP"
            else:
                event_type = "TRANSITION"

            event = EngineEvent(
                event_type=event_type,
                timestamp=now,
                current_state=self.machine.current_state,
                symbol=symbol,
                gesture_name=sym_name,
                voice_feedback=output.voice_feedback,
                action=output.action,
                command_name=output.command_name,
                sequence_progress=list(self.active_sequence) if not output.is_terminal else completed_sequence,
                details={
                    "is_self_loop": output.is_self_loop,
                    "is_terminal": output.is_terminal,
                    "is_error": output.is_error,
                    "is_intermediate": output.is_intermediate,
                    "completed_sequence": completed_sequence if output.is_terminal else None,
                    "manual": True
                }
            )
            self._emit(event)
            return event

    def manual_reset(self) -> EngineEvent:
        with self.lock:
            now = time.time()
            output = self.machine.reset()
            self.active_sequence.clear()
            self.sequence_start_time = None
            self.last_accepted_symbol = None
            self.candidate_symbol = None
            self.in_neutral_cooldown = False

            event = EngineEvent(
                event_type="RESET",
                timestamp=now,
                current_state=self.machine.current_state,
                voice_feedback=output.voice_feedback,
                sequence_progress=[]
            )
            self._emit(event)
            return event

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "current_state": self.machine.current_state,
                "active_sequence": list(self.active_sequence),
                "in_neutral_cooldown": self.in_neutral_cooldown,
                "candidate_symbol": self.candidate_symbol,
                "history": self.machine.transition_history[-10:]
            }

