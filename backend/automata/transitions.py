from typing import List, Dict, Tuple, Optional, Set
from pydantic import BaseModel
from backend.config import CommandConfig, VALID_GESTURES, GESTURE_NAMES

class StateNode(BaseModel):
    id: str
    label: str
    is_initial: bool = False
    is_dead: bool = False
    is_final: bool = False
    depth: int = 0
    prefix: List[str] = []
    associated_command_id: Optional[str] = None

class TransitionRule(BaseModel):
    from_state: str
    symbol: str
    to_state: str
    output_action: str
    voice_feedback: Optional[str] = None
    is_self_loop: bool = False

def validate_command_configurations(commands: List[CommandConfig]) -> Tuple[bool, Optional[str]]:
    """
    Validates that:
    1. Only enabled commands are considered.
    2. Sequences contain only valid alphabet symbols: {P, F, V, T, L}.
    3. No two enabled commands have identical sequences.
    4. No enabled command sequence is a strict prefix of another enabled command sequence.
    """
    enabled_cmds = [cmd for cmd in commands if cmd.enabled]
    seq_map: Dict[str, str] = {} # seq_str -> cmd_name
    seq_lists: List[Tuple[str, List[str]]] = []

    for cmd in enabled_cmds:
        if not cmd.sequence or len(cmd.sequence) < 2:
            return False, f"Command '{cmd.name}' must have at least 2 gesture steps."
        for sym in cmd.sequence:
            if sym not in VALID_GESTURES:
                return False, f"Invalid symbol '{sym}' in command '{cmd.name}'. Alphabet is {VALID_GESTURES}."
        
        seq_str = "->".join(cmd.sequence)
        if seq_str in seq_map:
            return False, f"Conflicting duplicate sequence: '{cmd.name}' and '{seq_map[seq_str]}' share {seq_str}."
        seq_map[seq_str] = cmd.name
        seq_lists.append((cmd.name, cmd.sequence))

    # Prefix clash check
    for name_a, seq_a in seq_lists:
        for name_b, seq_b in seq_lists:
            if name_a != name_b and len(seq_a) < len(seq_b):
                if seq_b[:len(seq_a)] == seq_a:
                    return False, f"Prefix conflict: '{name_a}' ({seq_a}) is a strict prefix of '{name_b}' ({seq_b})."

    return True, None

