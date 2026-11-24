import pytest
from backend.commands.command_dispatcher import CommandDispatcher

@pytest.fixture
def dispatcher():
    return CommandDispatcher()

def test_sos_dispatch(dispatcher):
    res = dispatcher.dispatch("EMERGENCY_SOS")
    assert res["status"] == "success"
    assert res["action"] == "EMERGENCY_SOS"
    assert "modal_title" in res

def test_screen_reader_dispatch(dispatcher):
    res = dispatcher.dispatch("READ_SCREEN")
    assert res["status"] == "success"
    assert "text_to_read" in res

    stop_res = dispatcher.dispatch("STOP_READING")
    assert stop_res["status"] == "success"
    assert stop_res["is_active"] is False

def test_volume_controls(dispatcher):
    res_up = dispatcher.dispatch("VOLUME_UP")
    assert res_up["status"] == "success"

    res_down = dispatcher.dispatch("VOLUME_DOWN")
    assert res_down["status"] == "success"

    res_mute = dispatcher.dispatch("MUTE_AUDIO")
    assert res_mute["status"] == "success"

def test_system_lock_safety_guard(dispatcher):
    """When allow_system_lock is False, it should simulate and NOT lock real session"""
    res = dispatcher.dispatch("SYSTEM_LOCK")
    assert res["status"] == "simulated"
    assert res["safety_engaged"] is True

def test_cancel_operation(dispatcher):
    res = dispatcher.dispatch("CANCEL_OPERATION")
    assert res["status"] == "success"

