export function getApiBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  return `${window.location.origin}/api`;
}

export function getCameraStreamUrl() {
  return `${getApiBaseUrl()}/camera/stream`;
}

export const API_BASE = getApiBaseUrl();
export const CAMERA_STREAM_URL = getCameraStreamUrl();

let browserCameraStream = null;
let cameraVideo = null;
let cameraCanvas = null;
let cameraFrameTimer = null;
let frameUploadInProgress = false;

function releaseBrowserCamera() {
  if (cameraFrameTimer !== null) {
    window.clearInterval(cameraFrameTimer);
    cameraFrameTimer = null;
  }
  if (browserCameraStream) {
    browserCameraStream.getTracks().forEach((track) => track.stop());
    browserCameraStream = null;
  }
  if (cameraVideo) {
    cameraVideo.srcObject = null;
    cameraVideo = null;
  }
  cameraCanvas = null;
}

async function uploadCameraFrame() {
  if (!cameraVideo || !cameraCanvas || cameraVideo.readyState < 2) return;
  cameraCanvas.width = 640;
  cameraCanvas.height = 480;
  const context = cameraCanvas.getContext('2d');
  context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  const frame = await new Promise((resolve) => cameraCanvas.toBlob(resolve, 'image/jpeg', 0.7));
  if (!frame) throw new Error('Could not capture a frame from the webcam.');

  const response = await fetch(`${API_BASE}/camera/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: frame
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.detail || result.error || 'Failed to send webcam frame to the vision engine.');
  }
}

async function uploadNextCameraFrame() {
  if (frameUploadInProgress) return;
  frameUploadInProgress = true;
  try {
    await uploadCameraFrame();
  } catch (error) {
    console.error('Webcam frame upload failed:', error);
    if (cameraFrameTimer !== null) {
      window.clearInterval(cameraFrameTimer);
      cameraFrameTimer = null;
    }
  } finally {
    frameUploadInProgress = false;
  }
}

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

export async function startCamera() {
  if (browserCameraStream) return { success: true, message: "Camera already started" };
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Webcam access is unavailable. Open this site over HTTPS and use a supported browser.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
  } catch (error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Webcam permission was denied. Allow camera access for this site, then try again.');
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No webcam was found on this device.');
    }
    throw new Error(error.message || 'Could not access the webcam.');
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  let backendStarted = false;
  try {
    await video.play();
    if (video.readyState < 2) {
      await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
    }

    const response = await fetch(`${API_BASE}/camera/start?source=browser`, { method: 'POST' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.detail || result.error || 'The vision service could not start.');
    }
    backendStarted = true;

    browserCameraStream = stream;
    cameraVideo = video;
    cameraCanvas = document.createElement('canvas');
    await uploadCameraFrame();
    cameraFrameTimer = window.setInterval(uploadNextCameraFrame, 100);
    return result;
  } catch (error) {
    releaseBrowserCamera();
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    if (backendStarted) {
      try {
        await fetch(`${API_BASE}/camera/stop`, { method: 'POST' });
      } catch (cleanupError) {
        console.error('Could not stop the backend camera after startup failed:', cleanupError);
      }
    }
    throw error;
  }
}

export async function stopCamera() {
  releaseBrowserCamera();
  const res = await fetch(`${API_BASE}/camera/stop`, { method: "POST" });
  const result = await res.json();
  if (!res.ok || !result.success) {
    throw new Error(result.detail || result.error || 'Failed to stop the camera.');
  }
  return result;
}

export async function fetchAutomataGraph() {
  const res = await fetch(`${API_BASE}/automata/graph`);
  if (!res.ok) throw new Error("Failed to fetch automata graph");
  return res.json();
}

export async function resetAutomata() {
  const res = await fetch(`${API_BASE}/automata/reset`, { method: "POST" });
  return res.json();
}

export async function manualStep(symbol) {
  const res = await fetch(`${API_BASE}/automata/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol })
  });
  return res.json();
}

export async function fetchCommands() {
  const res = await fetch(`${API_BASE}/commands`);
  return res.json();
}

export async function updateCommands(commands) {
  const res = await fetch(`${API_BASE}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update commands");
  }
  return res.json();
}

export async function resetCommands() {
  const res = await fetch(`${API_BASE}/commands/reset`, { method: "POST" });
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  });
  return res.json();
}

export async function fetchActivity(limit = 50) {
  const res = await fetch(`${API_BASE}/activity?limit=${limit}`);
  return res.json();
}

export async function clearActivity() {
  const res = await fetch(`${API_BASE}/activity`, { method: "DELETE" });
  return res.json();
}

