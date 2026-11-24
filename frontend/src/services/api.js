export function getApiBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:8000/api";
  return `${window.location.origin}/api`;
}

export function getCameraStreamUrl() {
  return `${getApiBaseUrl()}/camera/stream`;
}

export const API_BASE = getApiBaseUrl();
export const CAMERA_STREAM_URL = getCameraStreamUrl();

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

export async function startCamera() {
  const res = await fetch(`${API_BASE}/camera/start`, { method: "POST" });
  return res.json();
}

export async function stopCamera() {
  const res = await fetch(`${API_BASE}/camera/stop`, { method: "POST" });
  return res.json();
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

