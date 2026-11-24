# CHIRO-AUTOMATA: A Formal Language Compiler for Live Webcam Hand Gesture Combos

**Touchless Assistive Computer Control for Visually, Speech, and Motor-Impaired Users**  
**Theory of Computation Capstone Project**  
*SIMATS Engineering — Department of Computer Science & Engineering*

---

## 1. Project Overview & Objectives

Traditional human-computer interfaces rely heavily on fine physical motor coordination (mouse/keyboard) or clear speech input (voice assistants). Users with severe motor impairments, visual impairments, or speech difficulties are frequently marginalized by conventional interfaces. Furthermore, naive computer vision interfaces that map single static hand poses directly to actions pose severe safety hazards: accidental hand tremors or casual movements can trigger destructive actions (e.g., locking the system, invoking alerts).

**CHIRO-AUTOMATA** resolves this fundamental assistive and theoretical gap by compiling continuous 30 FPS webcam video into deliberate multi-step formal language strings validated by a custom **Mealy Machine Transducer**:

$$M = (Q, \Sigma, \Delta, \delta, \lambda, q_0)$$

### Core System Pipeline
```
Webcam Frame (30 FPS)
       │
       ▼
[MediaPipe Hands (21 Landmarks)] ──► Normalized Coordinates (x, y, z)
       │
       ▼
[Geometric Classifier] ────────────► Symbol token ∈ Σ = {P, F, V, T, L}
       │
       ▼
[Debounce & Stability Filter] ─────► Stable token sequence (e.g., P⁺ F⁺ V⁺)
       │
       ▼
[Mealy Machine M] ─────────────────► (δ: State transition, λ: Spoken feedback & command)
       │
       ├──► Live React State Visualizer (Server-Sent Events)
       ├──► Web Speech API (Queued non-blocking voice synthesis)
       └──► Modular OS Command Dispatcher (Lock, Mute, Volume, Screenshot, etc.)
```

---

## 2. Theory of Computation: Formal Mealy Machine Specification

The sequence compiler is formally defined as a 6-tuple $M = (Q, \Sigma, \Delta, \delta, \lambda, q_0)$:

- **Input Alphabet ($\Sigma$)**:
  $$\Sigma = \{P, F, V, T, L\}$$
  - `P`: **Open Palm** (All 5 digits extended)
  - `F`: **Closed Fist** (All 5 digits curled into palm)
  - `V`: **Peace Sign** (Index and Middle extended in V-formation; others folded)
  - `T`: **Thumbs Up** (Thumb extended vertically upward; fingers curled)
  - `L`: **L-Shape** (Thumb extended horizontally, Index extended vertically; perpendicular $\approx 90^\circ$)

- **State Set ($Q$)**:
  $$Q = \{q_0, q_{\text{dead}}\} \cup Q_{\text{intermediate}}$$
  Dynamically compiled into a deterministic prefix tree (Trie). For the 10 three-gesture commands, $|Q| = 22$ unique states.
  - $q_0$: Initial Idle State.
  - $q_{\text{dead}}$: Trap/Error State entered upon receiving an invalid continuation token.
  - Intermediate nodes: $q_P, q_{P\_F}, q_F, q_{F\_T}$, etc.

- **Output Alphabet ($\Delta$)**:
  $$\Delta = \{\varepsilon, \text{EMERGENCY\_SOS}, \text{READ\_SCREEN}, \text{SYSTEM\_LOCK}, \text{MUTE\_AUDIO}, \text{VOLUME\_UP}, \text{VOLUME\_DOWN}, \text{SCREENSHOT}, \text{OPEN\_APPLICATION}, \text{STOP\_READING}, \text{CANCEL\_OPERATION}\} \cup \text{TTS\_EVENTS}$$

- **Transition Function ($\delta$) & Output Function ($\lambda$)**:
  - **Self-Loops for 30 FPS Stream Invariance**: When user holds a pose, repeated observations of symbol $\sigma$ stay in the same state with null output $\varepsilon$:
    $$\delta(q_i, \sigma) = q_i, \quad \lambda(q_i, \sigma) = \varepsilon$$
  - **Valid Sequence Step**: When transitioning to the next gesture after release:
    $$\delta(q_i, \sigma_{\text{next}}) = q_{i+1}, \quad \lambda(q_i, \sigma_{\text{next}}) = \text{"Spoken Progress Confirmation"}$$
  - **Terminal Trigger**: On final gesture:
    $$\delta(q_{\text{penultimate}}, \sigma_{\text{final}}) = q_0, \quad \lambda = \text{Execute Command} + \text{"Sequence Completed"}$$
  - **Dead State Trapping**: On invalid input:
    $$\delta(q_i, \sigma_{\text{invalid}}) = q_{\text{dead}}, \quad \lambda = \text{"Invalid Sequence"}$$

---

## 3. The 10 Configurable Command Combinations

| ID | Command Name | Sequence | Formal Regex | Action Output ($\Delta$) | Spoken Feedback |
|:---|:---|:---:|:---:|:---|:---|
| 1 | **Emergency SOS** | $P \to F \to V$ | $P^+ F^+ V^+$ | High-visibility simulated beacon popup modal | "Emergency alert activated" |
| 2 | **Read Screen** | $F \to T \to L$ | $F^+ T^+ L^+$ | Reads foreground window title & clipboard aloud | "Reading screen aloud" |
| 3 | **System Lock** | $V \to P \to F$ | $V^+ P^+ F^+$ | Windows `user32.LockWorkStation()` (safety toggle) | "Locking workstation" |
| 4 | **Mute Audio** | $P \to T \to F$ | $P^+ T^+ F^+$ | Windows master volume mute toggle (PyCAW) | "Audio muted" |
| 5 | **Volume Up** | $T \to P \to V$ | $T^+ P^+ V^+$ | Increments system volume by +10% | "Volume increased" |
| 6 | **Volume Down** | $T \to F \to V$ | $T^+ F^+ V^+$ | Decrements system volume by -10% | "Volume decreased" |
| 7 | **Screenshot** | $L \to P \to T$ | $L^+ P^+ T^+$ | Captures desktop to `screenshots/` directory | "Screenshot captured" |
| 8 | **Open Application** | $V \to T \to L$ | $V^+ T^+ L^+$ | Launches configured whitelisted app (Notepad/Calc) | "Launching application" |
| 9 | **Stop Reading** | $F \to L \to P$ | $F^+ L^+ P^+$ | Halts active speech synthesis queue immediately | "Reading stopped" |
| 10 | **Cancel Operation** | $L \to F \to P$ | $L^+ F^+ P^+$ | Resets in-progress Mealy sequence back to $q_0$ | "Operation cancelled" |

---

## 4. Technology Stack

- **Computer Vision & Tracking**: OpenCV + Google MediaPipe Hands (21 3D Joint Landmarks).
- **Gesture Classification**: Pure geometry-based Euclidean vector angles, finger extension ratios, and wrist-normalized coordinates.
- **Automata & Timing Engine**: Custom Python Mealy Machine Trie compiler with stability debounce ($500\text{ ms}$), neutral cooldown ($300\text{ ms}$), and timeout watcher ($2\text{ s}$ inter-gesture, $10\text{ s}$ sequence).
- **Backend**: Python, FastAPI, Server-Sent Events, Uvicorn, PyCAW, Pillow.
- **Frontend Dashboard**: React 18, Vite, Lucide Icons, Modern Dark Cyber-Assistive UI with real-time SVG Automata State Graph.
- **Audio Feedback**: Browser Web Speech API (`window.speechSynthesis`) with queued, non-overlapping voice announcements.

---

## 5. Installation & Execution Guide

### Prerequisites
- Windows 10 or 11
- Python 3.10+ (Python 3.11/3.15 supported)
- Node.js v18+ and npm

### 1. Install Dependencies
```powershell
# In the project root directory:
pip install -r requirements.txt

# In the frontend directory:
cd frontend
npm install
npm run build
cd ..
```

### 2. Launch CHIRO-AUTOMATA
You can launch the backend and open the web dashboard:
```powershell
# Start the backend server (automatically serves the compiled React dashboard at http://localhost:8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open your browser to: **`http://localhost:8000`** (or run `npm run dev` in `frontend/` for hot-reloading dev mode at `http://localhost:5173`).

### Cloud Demo on Render

[Deploy this repository to Render](https://render.com/deploy?repo=https://github.com/logeswaranraj27/CHIRO-AUTOMATA-GESTURE-CONROL) and select the free web service. Render reads `render.yaml`, builds the Docker image, and deploys the `main` branch.

The cloud demo hosts the dashboard and API, but the backend cannot access your browser's webcam or control your personal Windows workstation. Those features require running the backend locally on Windows. Render's free service also sleeps when idle and uses temporary storage, so screenshots and activity logs are not persistent.

---

## 6. Manual Testing Guide for Live Webcam Interaction

1. Open **`http://localhost:8000`** in Google Chrome or Microsoft Edge.
2. In the **Live Vision Stream** card, click **Start Camera**.
3. Hold your hand in front of the webcam (~0.5 to 1 meter away):
   - **Test Gesture P (Open Palm)**: Spread all five fingers open. Observe the **P (Open Palm)** detection card and 21-point cyan skeleton.
   - **Test Gesture F (Closed Fist)**: Curl all five fingers inward. Observe the **F (Closed Fist)** detection.
   - **Test Gesture V (Peace Sign)**: Raise only index and middle fingers in a V. Observe the **V (Peace Sign)** detection.
   - **Test Gesture T (Thumbs Up)**: Make a fist and extend your thumb straight up. Observe **T (Thumbs Up)**.
   - **Test Gesture L (L-Shape)**: Point index finger up and thumb sideways ($90^\circ$). Observe **L (L-Shape)**.
4. **Execute Emergency SOS Combo ($P \to F \to V$)**:
   - Hold **Open Palm ($P$)** steadily for $0.5\text{ s}$. You will hear: *"First gesture recognized: Open Palm"* and see the automata transition to $q_P$.
   - Relax your hand for $0.3\text{ s}$ (neutral release interval).
   - Form a **Closed Fist ($F$)** steadily for $0.5\text{ s}$. You will hear: *"Second gesture recognized: Closed Fist"* and see the automata transition to $q_{P\_F}$.
   - Relax your hand briefly, then form a **Peace Sign ($V$)**.
   - You will hear: *"Sequence completed. Emergency SOS activated."* and the **Emergency Alert Modal** will appear on the dashboard!
5. **Test Invalid Sequence Trap ($q_{\text{dead}}$)**:
   - Perform $P$, then $F$, then make an incorrect gesture like $T$ instead of $V$.
   - The system immediately transitions to **$q_{\text{dead}}$** and announces *"Invalid sequence"*.
   - Wait $2\text{ s}$ without gesturing; the timeout watcher automatically resets the machine back to $q_0$.

---

## 7. Automated Test Suite

Run the comprehensive 25-test automated unit test suite:
```powershell
python -m pytest backend/tests/ -v
```

Test Coverage Includes:
- `test_gesture_geometry.py`: Mathematical classification of all 5 postures ($P, F, V, T, L$) and boundary conditions.
- `test_mealy_machine.py`: Deterministic state transitions for all 10 commands, self-loop duplicate absorption, dead-state trapping, reset logic, duplicate sequence rejection, and prefix clash validation.
- `test_timing_engine.py`: Stability duration verification ($500\text{ ms}$), neutral cooldown enforcement ($300\text{ ms}$), and inter-gesture timeout resets ($2\text{ s}$).
- `test_commands.py`: Command dispatcher routing for SOS, screen reader, system volume, safety-gated system lock, and cancellation.
- `test_api_routes.py`: REST API endpoints and state queries.

---

## 8. Known Limitations & Architectural Notes

1. **Lighting & Contrast**: MediaPipe Hand Landmarker relies on visible hand-contrast against backgrounds. In extreme low-light environments, landmark confidence may dip below the $0.70$ threshold. The threshold can be tuned dynamically in the **Accessibility Settings** tab.
2. **System Lock Safety**: By default, the workstation locking command (`user32.LockWorkStation`) operates in safe simulation mode to prevent accidental lockouts during evaluation. To enable real Windows session locking, toggle the safety switch in **Accessibility Settings**.
3. **Audio Output Driver**: Hand landmarker runs entirely on CPU/GPU vision tensors and does not bind audio capture hardware, preventing Windows PortAudio conflicts. Spoken announcements are handled by the browser's native Web Speech synthesis API.

