import pytest
from backend.config import DEFAULT_COMMANDS, config
from backend.automata.mealy_machine import MealyMachine
from backend.automata.state_manager import AutomataStateManager, EngineEvent
from backend.vision.gesture_classifier import GestureResult

def make_result(gesture: str, confidence=0.9):
    return GestureResult(
        gesture=gesture,
        confidence=confidence,
        name=gesture,
        finger_states={},
        details={}
    )

@pytest.fixture
def manager():
    machine = MealyMachine(DEFAULT_COMMANDS)
    return AutomataStateManager(machine)

def test_stability_filtering(manager):
    """Gesture must be held for 500ms before accepting"""
    events = []
    manager.add_listener(lambda e: events.append(e))

    t0 = 1000.0
    # Frame at 0ms: candidate registered, not accepted yet
    manager.process_gesture_observation(make_result("P"), now=t0)
    assert len(events) == 0
    assert manager.candidate_symbol == "P"

    # Frame at 300ms: still under 500ms
    manager.process_gesture_observation(make_result("P"), now=t0 + 0.3)
    assert len(events) == 0

    # Frame at 550ms: stability achieved!
    manager.process_gesture_observation(make_result("P"), now=t0 + 0.55)
    assert len(events) == 1
    assert events[0].event_type == "TRANSITION"
    assert events[0].symbol == "P"
    assert manager.machine.current_state == "q_P"

def test_neutral_interval_enforcement(manager):
    """After accepting a gesture, user must release (neutral) before next gesture is accepted"""
    events = []
    manager.add_listener(lambda e: events.append(e))

    t0 = 1000.0
    # Step 1: Accept P at t0 + 0.6
    manager.process_gesture_observation(make_result("P"), now=t0)
    manager.process_gesture_observation(make_result("P"), now=t0 + 0.6)
    assert len(events) == 1
    assert manager.in_neutral_cooldown is True

    # Immediate next frame with F should be blocked by neutral cooldown
    manager.process_gesture_observation(make_result("F"), now=t0 + 0.65)
    assert len(events) == 1

    # Hand goes neutral for 350ms
    manager.process_gesture_observation(make_result(None), now=t0 + 0.7)
    manager.process_gesture_observation(make_result(None), now=t0 + 1.1)
    assert manager.in_neutral_cooldown is False

    # Now show F steadily for 550ms
    manager.process_gesture_observation(make_result("F"), now=t0 + 1.2)
    manager.process_gesture_observation(make_result("F"), now=t0 + 1.8)
    assert len(events) == 2
    assert events[1].symbol == "F"
    assert manager.machine.current_state == "q_P_F"

def test_inter_gesture_timeout(manager):
    """Timeout resets automata to q0 after 2s without gesture"""
    events = []
    manager.add_listener(lambda e: events.append(e))

    t0 = 1000.0
    # Accept P
    manager.process_gesture_observation(make_result("P"), now=t0)
    manager.process_gesture_observation(make_result("P"), now=t0 + 0.6)
    assert manager.machine.current_state == "q_P"

    # User waits 2.5 seconds (inter_gesture_timeout_sec = 2.0)
    manager.check_timeouts(now=t0 + 0.6 + 2.5)
    assert manager.machine.current_state == "q0"
    assert len(events) == 2
    assert events[1].event_type == "TIMEOUT"

