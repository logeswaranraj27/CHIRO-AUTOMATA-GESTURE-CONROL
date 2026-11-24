import time
import asyncio
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import config, SCREENSHOTS_DIR
from backend.vision.camera import CameraService
from backend.automata.mealy_machine import MealyMachine
from backend.automata.state_manager import AutomataStateManager, EngineEvent
from backend.commands.command_dispatcher import dispatcher
from backend.services.activity_logger import activity_logger
from backend.services.voice_events import VoiceManager
from backend.api.routes import router as api_router, init_route_services
from backend.api.sse import sse_manager

# Singletons
mealy_machine = MealyMachine(config.commands)
state_manager = AutomataStateManager(mealy_machine)
camera_service = CameraService(confidence_threshold=config.settings.gesture_confidence_threshold)

init_route_services(camera_service, state_manager, mealy_machine)

# Hook Camera callback to State Manager
last_telemetry_time = 0.0

def on_frame_gesture(gesture_res, landmarks):
    global last_telemetry_time
    # 1. Feed into Mealy State Manager
    state_manager.process_gesture_observation(gesture_res)
    automata_status = state_manager.get_status()

    # 2. Throttled telemetry broadcast (~15 Hz)
    now = time.time()
    if now - last_telemetry_time > 0.065:
        last_telemetry_time = now
        telemetry_payload = {
            "type": "TELEMETRY",
            "timestamp": now,
            "gesture": {
                "symbol": gesture_res.gesture,
                "name": gesture_res.name,
                "confidence": gesture_res.confidence,
                "finger_states": gesture_res.finger_states
            },
            "fps": round(camera_service.fps, 1),
            "current_state": automata_status["current_state"],
            "active_sequence": automata_status["active_sequence"],
            "in_neutral_cooldown": automata_status["in_neutral_cooldown"],
            "camera_running": camera_service.is_running
        }
        sse_manager.broadcast(telemetry_payload)

camera_service.on_gesture_callback = on_frame_gesture

# Hook State Manager events
def on_engine_event(event: EngineEvent):
    # 1. Log activity
    msg = event.voice_feedback or f"Automata event: {event.event_type}"
    activity_logger.log(
        event_type=event.event_type,
        message=msg,
        gesture=event.symbol,
        state=event.current_state,
        command=event.command_name,
        details=event.details
    )

    # 2. Execute command action if terminal
    action_result = None
    if event.action:
        cmd = config.get_command_by_id(event.action)
        target = cmd.target if cmd else None
        action_result = dispatcher.dispatch(event.action, target=target)

    # 3. Broadcast the actual automata event and current state.
    payload = {
        "type": "ENGINE_EVENT",
        "event": event.model_dump(),
        "automata": {"history": mealy_machine.transition_history[-10:]},
        "action_result": action_result
    }
    sse_manager.broadcast(payload)

    # 4. Spoken voice feedback
    if event.voice_feedback and config.settings.voice_feedback_enabled:
        is_high_priority = event.event_type in ["COMMAND_FIRED", "ERROR", "TIMEOUT"]
        voice_payload = VoiceManager.format_speech_payload(
            event.voice_feedback,
            priority="high" if is_high_priority else "normal"
        )
        sse_manager.broadcast(voice_payload)

state_manager.add_listener(on_engine_event)

# Background Timeout Watcher Thread
timeout_watcher_running = True

def timeout_watcher_loop():
    while timeout_watcher_running:
        try:
            state_manager.check_timeouts()
        except Exception:
            pass
        time.sleep(0.1)

timeout_thread = threading.Thread(target=timeout_watcher_loop, daemon=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    loop = asyncio.get_running_loop()
    sse_manager.set_loop(loop)
    if not timeout_thread.is_alive():
        timeout_thread.start()
    
    activity_logger.log(event_type="SYSTEM", message="Chiro-Automata backend engine initialized.")
    yield
    # Shutdown
    global timeout_watcher_running
    timeout_watcher_running = False
    camera_service.stop()
    activity_logger.log(event_type="SYSTEM", message="Chiro-Automata backend engine stopped.")

app = FastAPI(
    title="CHIRO-AUTOMATA Backend",
    description="Formal Language Compiler for Live Webcam Hand Gesture Combos",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Mount screenshots directory
app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")

# Mount frontend production build if available
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static_frontend")

