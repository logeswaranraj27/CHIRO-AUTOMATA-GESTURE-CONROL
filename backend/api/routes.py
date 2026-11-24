import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Response, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from backend.config import config, CommandConfig, AccessibilitySettings, SCREENSHOTS_DIR, VALID_GESTURES, GESTURE_NAMES
from backend.services.activity_logger import activity_logger
from backend.automata.transitions import validate_command_configurations
from backend.commands.command_dispatcher import dispatcher
from backend.api.sse import sse_manager

router = APIRouter(prefix="/api")

# Injected by main.py
camera_service = None
state_manager = None
mealy_machine = None

def init_route_services(cam, sm, mm):
    global camera_service, state_manager, mealy_machine
    camera_service = cam
    state_manager = sm
    mealy_machine = mm

# --- Status Endpoint ---
@router.get("/status")
def get_system_status():
    cam_status = camera_service.get_status() if camera_service else {}
    sm_status = state_manager.get_status() if state_manager else {}
    return {
        "status": "online",
        "timestamp": time.time(),
        "camera": cam_status,
        "automata": sm_status,
        "settings": config.settings.model_dump(),
        "total_commands": len(config.commands),
        "enabled_commands": len([c for c in config.commands if c.enabled])
    }

@router.get("/events/stream")
async def events_stream(request: Request):
    initial_snapshot = {
        "type": "INITIAL_STATE",
        "automata": state_manager.get_status() if state_manager else {},
        "camera": camera_service.get_status() if camera_service else {},
        "settings": config.settings.model_dump(),
        "commands": [cmd.model_dump() for cmd in config.commands],
    }
    return await sse_manager.stream(request, initial_snapshot)

# --- Camera Endpoints ---
@router.post("/camera/start")
def start_camera():
    if not camera_service:
        raise HTTPException(status_code=500, detail="Camera service not initialized")
    success = camera_service.start()
    activity_logger.log(
        event_type="CAMERA",
        message="Webcam capture started." if success else f"Failed to start camera: {camera_service.error_message}"
    )
    sse_manager.broadcast({
        "type": "SYSTEM_STATUS",
        "camera": camera_service.get_status(),
    })
    if not success:
        return {"success": False, "error": camera_service.error_message}
    return {"success": True, "message": "Camera started"}

@router.post("/camera/stop")
def stop_camera():
    if not camera_service:
        raise HTTPException(status_code=500, detail="Camera service not initialized")
    camera_service.stop()
    activity_logger.log(event_type="CAMERA", message="Webcam capture stopped.")
    sse_manager.broadcast({
        "type": "SYSTEM_STATUS",
        "camera": camera_service.get_status(),
    })
    return {"success": True, "message": "Camera stopped"}

def _generate_mjpeg_stream():
    """Generates continuous MJPEG multipart stream"""
    while True:
        if camera_service:
            jpeg = camera_service.get_latest_jpeg()
            if jpeg:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n')
        time.sleep(0.033) # ~30 FPS

@router.get("/camera/stream")
def camera_stream():
    return StreamingResponse(
        _generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/camera/snapshot")
def camera_snapshot():
    if not camera_service:
        raise HTTPException(status_code=500, detail="Camera service not initialized")
    jpeg = camera_service.get_latest_jpeg()
    if not jpeg:
        raise HTTPException(status_code=404, detail="No frame available")
    return Response(content=jpeg, media_type="image/jpeg")

# --- Automata & Graph Endpoints ---
@router.get("/automata/graph")
def get_automata_graph():
    if not mealy_machine:
        raise HTTPException(status_code=500, detail="Automata not initialized")
    return mealy_machine.get_formal_definition()

@router.post("/automata/reset")
def reset_automata():
    if not state_manager:
        raise HTTPException(status_code=500, detail="State manager not initialized")
    event = state_manager.manual_reset()
    activity_logger.log(event_type="RESET", message="Automata manually reset to idle state (q0).")
    return {"success": True, "event": event.model_dump()}

class StepRequest(BaseModel):
    symbol: str

@router.post("/automata/step")
def manual_step(req: StepRequest):
    if not state_manager or not mealy_machine:
        raise HTTPException(status_code=500, detail="State manager not initialized")
    if req.symbol not in VALID_GESTURES:
        raise HTTPException(status_code=400, detail=f"Invalid symbol '{req.symbol}'. Valid: {VALID_GESTURES}")

    event = state_manager.process_manual_symbol(req.symbol)

    return {
        "current_state": event.current_state,
        "event": event.model_dump(),
        "active_sequence": event.sequence_progress,
        "output": {
            "current_state": event.current_state,
            "voice_feedback": event.voice_feedback,
            "action": event.action,
            "command_name": event.command_name,
            "is_intermediate": event.details.get("is_intermediate", False),
            "is_terminal": event.details.get("is_terminal", False),
            "is_error": event.details.get("is_error", False),
            "is_self_loop": event.details.get("is_self_loop", False)
        }
    }

# --- Command Configuration Endpoints ---
@router.get("/commands")
def list_commands():
    return [cmd.model_dump() for cmd in config.commands]

class UpdateCommandsRequest(BaseModel):
    commands: List[CommandConfig]

@router.post("/commands")
def update_commands(req: UpdateCommandsRequest):
    valid, err = validate_command_configurations(req.commands)
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    config.commands = req.commands
    # Recompile Mealy Machine with new commands
    if mealy_machine:
        mealy_machine.compile_from_commands(config.commands)
    if state_manager:
        state_manager.manual_reset()

    activity_logger.log(event_type="CONFIG", message="Command combinations updated and Mealy Machine recompiled.")
    return {"success": True, "commands": [cmd.model_dump() for cmd in config.commands]}

@router.post("/commands/reset")
def reset_commands_to_default():
    config.reset_to_defaults()
    if mealy_machine:
        mealy_machine.compile_from_commands(config.commands)
    if state_manager:
        state_manager.manual_reset()
    activity_logger.log(event_type="CONFIG", message="Commands and settings restored to defaults.")
    return {"success": True, "commands": [cmd.model_dump() for cmd in config.commands]}

# --- Accessibility Settings Endpoints ---
@router.get("/settings")
def get_settings():
    return config.settings.model_dump()

@router.post("/settings")
def update_settings(new_settings: AccessibilitySettings):
    config.settings = new_settings
    if camera_service:
        camera_service.set_confidence_threshold(new_settings.gesture_confidence_threshold)
    activity_logger.log(event_type="CONFIG", message="Accessibility settings updated.")
    return {"success": True, "settings": config.settings.model_dump()}

# --- Activity History Endpoints ---
@router.get("/activity")
def get_activity(limit: int = 50):
    return activity_logger.get_recent(limit=limit)

@router.delete("/activity")
def clear_activity():
    activity_logger.clear()
    return {"success": True, "message": "Activity log cleared."}

# --- Screenshots Endpoint ---
@router.get("/screenshots/{filename}")
def get_screenshot(filename: str):
    file_path = SCREENSHOTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(path=str(file_path), media_type="image/png")

