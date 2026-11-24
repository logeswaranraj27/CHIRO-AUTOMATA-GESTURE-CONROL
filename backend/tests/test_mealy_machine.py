import pytest
from backend.config import DEFAULT_COMMANDS, CommandConfig
from backend.automata.mealy_machine import MealyMachine, AutomataOutput
from backend.automata.transitions import validate_command_configurations

@pytest.fixture
def machine():
    return MealyMachine(DEFAULT_COMMANDS)

def test_initial_state(machine):
    assert machine.current_state == "q0"
    assert len(machine.states) > 2
    assert "q0" in machine.states
    assert "q_dead" in machine.states

def test_all_ten_commands_valid_execution(machine):
    """Verify that all 10 default command sequences execute successfully and return to q0"""
    for cmd in DEFAULT_COMMANDS:
        machine.reset()
        seq = cmd.sequence
        # Execute prefix steps
        for step in seq[:-1]:
            out = machine.step(step)
            assert out.is_intermediate is True
            assert out.action is None
            assert out.voice_feedback is not None
            assert machine.current_state != "q0"
            assert machine.current_state != "q_dead"
        
        # Final step
        final_out = machine.step(seq[-1])
        assert final_out.is_terminal is True
        assert final_out.action == cmd.action_type
        assert final_out.command_name == cmd.name
        # Must return to q0 after completion
        assert machine.current_state == "q0"

def test_invalid_sequence_enters_dead_state(machine):
    """An unexpected sequence must trap into q_dead"""
    machine.reset()
    # P -> F is valid prefix for SOS (P->F->V). If user does P -> F -> T (wrong 3rd gesture)
    out1 = machine.step("P")
    assert machine.current_state == "q_P"
    out2 = machine.step("F")
    assert machine.current_state == "q_P_F"
    out3 = machine.step("T") # Wrong! Should be V for SOS
    assert machine.current_state == "q_dead"
    assert out3.is_error is True

    # Any subsequent input stays in dead state
    out4 = machine.step("V")
    assert machine.current_state == "q_dead"
    assert out4.is_self_loop is True

def test_self_loop_absorbs_duplicate_frames(machine):
    """In an intermediate state, repeated same symbol triggers self loop with null output"""
    machine.reset()
    machine.step("P")
    assert machine.current_state == "q_P"

    # User continues holding P for 10 frames
    for _ in range(10):
        out = machine.step("P")
        assert machine.current_state == "q_P"
        assert out.is_self_loop is True
        assert out.action is None
        assert out.voice_feedback is None

def test_reset_clears_dead_state(machine):
    machine.reset()
    machine.step("P")
    machine.step("F")
    machine.step("P") # Invalid
    assert machine.current_state == "q_dead"

    out = machine.reset()
    assert machine.current_state == "q0"
    assert out.action == "RESET"

def test_validation_prevents_duplicate_sequences():
    cmds = [
        CommandConfig(id="c1", name="Cmd 1", sequence=["P", "F", "V"], description="", action_type="A1"),
        CommandConfig(id="c2", name="Cmd 2", sequence=["P", "F", "V"], description="", action_type="A2")
    ]
    valid, err = validate_command_configurations(cmds)
    assert valid is False
    assert "Conflicting duplicate sequence" in err

def test_validation_prevents_prefix_clashes():
    cmds = [
        CommandConfig(id="c1", name="Short", sequence=["P", "F"], description="", action_type="A1"),
        CommandConfig(id="c2", name="Long", sequence=["P", "F", "V"], description="", action_type="A2")
    ]
    valid, err = validate_command_configurations(cmds)
    assert valid is False
    assert "Prefix conflict" in err

