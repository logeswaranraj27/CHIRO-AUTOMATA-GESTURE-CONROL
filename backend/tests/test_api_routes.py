import pytest
from backend.api.routes import (
    get_system_status, get_automata_graph, list_commands,
    manual_step, reset_automata, StepRequest
)
from backend.main import camera_service, state_manager, mealy_machine
from backend.config import config

def test_api_status_direct():
    res = get_system_status()
    assert res["status"] == "online"
    assert "camera" in res
    assert "automata" in res
    assert "settings" in res
    assert res["total_commands"] == 10

def test_api_automata_graph_direct():
    data = get_automata_graph()
    assert "Q" in data
    assert "Sigma" in data
    assert "q0" in data
    assert data["q0"] == "q0"
    assert data["q_dead"] == "q_dead"

def test_api_commands_list_direct():
    cmds = list_commands()
    assert len(cmds) == 10
    assert any(c["name"] == "Emergency SOS" for c in cmds)

def test_api_automata_step_and_reset_direct():
    # Step with 'P'
    req = StepRequest(symbol="P")
    res = manual_step(req)
    assert res["current_state"] == "q_P"
    assert res["output"]["is_intermediate"] is True

    # Reset
    reset_res = reset_automata()
    assert reset_res["success"] is True

    # Verify back to q0
    status_res = get_system_status()
    assert status_res["automata"]["current_state"] == "q0"
