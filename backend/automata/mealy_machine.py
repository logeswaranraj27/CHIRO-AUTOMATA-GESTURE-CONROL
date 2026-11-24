from typing import Dict, List, Tuple, Optional, Any
from pydantic import BaseModel
from backend.config import CommandConfig, VALID_GESTURES, GESTURE_NAMES
from .transitions import StateNode, TransitionRule, validate_command_configurations

class AutomataOutput(BaseModel):
    action: Optional[str] = None          # e.g. "EMERGENCY_SOS", "VOLUME_UP", "READ_SCREEN"
    command_name: Optional[str] = None
    voice_feedback: Optional[str] = None  # Spoken prompt
    is_intermediate: bool = False
    is_terminal: bool = False
    is_error: bool = False
    is_self_loop: bool = False

class MealyTransition(BaseModel):
    next_state: str
    output: AutomataOutput

class MealyMachine:
    """
    Formal Mealy Machine M = (Q, Σ, Δ, δ, λ, q0)
    - Q: Set of states
    - Σ: Input Alphabet {P, F, V, T, L}
    - Δ: Set of Output actions & speech notifications
    - δ: State transition function Q × Σ → Q
    - λ: Output function Q × Σ → Δ
    - q0: Initial state ("q0")
    - q_dead: Explicit error/trap state ("q_dead")
    """

    def __init__(self, commands: Optional[List[CommandConfig]] = None):
        self.sigma: List[str] = list(VALID_GESTURES)
        self.initial_state = "q0"
        self.dead_state = "q_dead"
        
        self.current_state: str = self.initial_state
        self.states: Dict[str, StateNode] = {}
        # transitions table: (current_state, symbol) -> (next_state, AutomataOutput)
        self.transition_table: Dict[Tuple[str, str], MealyTransition] = {}
        self.command_map: Dict[str, CommandConfig] = {}
        self.transition_history: List[Dict[str, Any]] = []

        if commands:
            self.compile_from_commands(commands)

    def compile_from_commands(self, commands: List[CommandConfig]):
        """
        Compiles the Mealy Machine states and transition table from active commands.
        Constructs a prefix-tree (Trie) automaton.
        """
        valid, err = validate_command_configurations(commands)
        if not valid:
            raise ValueError(f"Automata compilation failed: {err}")

        self.states.clear()
        self.transition_table.clear()
        self.command_map = {cmd.id: cmd for cmd in commands if cmd.enabled}

        # 1. Create Initial State q0
        self.states[self.initial_state] = StateNode(
            id=self.initial_state,
            label="q0 (Idle)",
            is_initial=True,
            depth=0,
            prefix=[]
        )

        # 2. Create Explicit Dead State q_dead
        self.states[self.dead_state] = StateNode(
            id=self.dead_state,
            label="q_dead (Trap)",
            is_dead=True,
            depth=-1,
            prefix=[]
        )
        # In dead state, any input self-loops in dead state
        for sym in self.sigma:
            self.transition_table[(self.dead_state, sym)] = MealyTransition(
                next_state=self.dead_state,
                output=AutomataOutput(
                    action=None,
                    voice_feedback=None,
                    is_error=True,
                    is_self_loop=True
                )
            )

        # 3. Build state paths for each enabled command
        for cmd in self.command_map.values():
            seq = cmd.sequence
            n_steps = len(seq)
            curr_state_id = self.initial_state

            for step_idx, sym in enumerate(seq):
                is_last_step = (step_idx == n_steps - 1)
                prefix = seq[:step_idx + 1]
                
                if is_last_step:
                    # Final step transitions directly back to q0 (or terminal node that resets)
                    # Output action fires here!
                    output = AutomataOutput(
                        action=cmd.action_type,
                        command_name=cmd.name,
                        voice_feedback=f"Sequence completed. {cmd.name} activated.",
                        is_intermediate=False,
                        is_terminal=True,
                        is_error=False
                    )
                    # Transition on final gesture leads back to q0
                    self.transition_table[(curr_state_id, sym)] = MealyTransition(
                        next_state=self.initial_state,
                        output=output
                    )
                else:
                    # Intermediate state
                    prefix_str = "_".join(prefix)
                    next_state_id = f"q_{prefix_str}"
                    
                    if next_state_id not in self.states:
                        sym_name = GESTURE_NAMES.get(sym, sym)
                        self.states[next_state_id] = StateNode(
                            id=next_state_id,
                            label=f"q({prefix_str})",
                            depth=step_idx + 1,
                            prefix=prefix,
                            associated_command_id=cmd.id
                        )

                    # Intermediate transition output
                    sym_name = GESTURE_NAMES.get(sym, sym)
                    ordinal = "First" if step_idx == 0 else "Second" if step_idx == 1 else f"Step {step_idx + 1}"
                    output = AutomataOutput(
                        action=None,
                        command_name=cmd.name,
                        voice_feedback=f"{ordinal} gesture recognized: {sym_name}.",
                        is_intermediate=True,
                        is_terminal=False,
                        is_error=False
                    )
                    self.transition_table[(curr_state_id, sym)] = MealyTransition(
                        next_state=next_state_id,
                        output=output
                    )

                    # 30 FPS self-loop: if user continues holding the same symbol, stay in next_state_id with null output!
                    self.transition_table[(next_state_id, sym)] = MealyTransition(
                        next_state=next_state_id,
                        output=AutomataOutput(action=None, voice_feedback=None, is_self_loop=True)
                    )

                    curr_state_id = next_state_id

        # 4. Fill undefined transitions with transitions to q_dead (complete DFA specification)
        for state_id in list(self.states.keys()):
            if state_id == self.dead_state:
                continue
            for sym in self.sigma:
                if (state_id, sym) not in self.transition_table:
                    if state_id == self.initial_state:
                        # In q0, an unrecognized first symbol can either stay in q0 or go to dead.
                        # Per specification: invalid gesture sequence goes to dead state.
                        self.transition_table[(state_id, sym)] = MealyTransition(
                            next_state=self.dead_state,
                            output=AutomataOutput(
                                action=None,
                                voice_feedback="Invalid initial gesture.",
                                is_error=True
                            )
                        )
                    else:
                        # In an intermediate state, wrong gesture traps in q_dead
                        self.transition_table[(state_id, sym)] = MealyTransition(
                            next_state=self.dead_state,
                            output=AutomataOutput(
                                action=None,
                                voice_feedback="Invalid sequence.",
                                is_error=True
                            )
                        )

        self.current_state = self.initial_state

    def step(self, symbol: str) -> AutomataOutput:
        """
        Executes one step in the Mealy Machine:
        δ: (current_state, symbol) -> next_state
        λ: (current_state, symbol) -> output
        """
        if symbol not in self.sigma:
            raise ValueError(f"Symbol '{symbol}' not in alphabet Σ = {self.sigma}")

        key = (self.current_state, symbol)
        if key not in self.transition_table:
            # Fallback to dead state
            self.current_state = self.dead_state
            output = AutomataOutput(
                action=None,
                voice_feedback="Invalid sequence.",
                is_error=True
            )
        else:
            trans = self.transition_table[key]
            prev_state = self.current_state
            self.current_state = trans.next_state
            output = trans.output

            if not output.is_self_loop:
                self.transition_history.append({
                    "from_state": prev_state,
                    "symbol": symbol,
                    "to_state": self.current_state,
                    "action": output.action,
                    "feedback": output.voice_feedback
                })
                # Keep last 50 transitions
                if len(self.transition_history) > 50:
                    self.transition_history.pop(0)

        return output

    def reset(self) -> AutomataOutput:
        """Resets the Mealy Machine back to q0"""
        self.current_state = self.initial_state
        return AutomataOutput(
            action="RESET",
            voice_feedback="Automata reset to idle.",
            is_intermediate=False,
            is_terminal=False,
            is_error=False
        )

    def get_formal_definition(self) -> Dict[str, Any]:
        """Returns the formal 6-tuple definition for UI inspection"""
        return {
            "Q": list(self.states.keys()),
            "Sigma": self.sigma,
            "Delta": list(set([cmd.action_type for cmd in self.command_map.values()])),
            "q0": self.initial_state,
            "q_dead": self.dead_state,
            "current_state": self.current_state,
            "states": [s.model_dump() for s in self.states.values()],
            "transition_count": len(self.transition_table)
        }

