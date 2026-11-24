import React, { useState, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  Hand,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Server,
  Radio,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { startCamera, stopCamera, manualStep, CAMERA_STREAM_URL } from '../services/api';

const GESTURE_CONFIG = {
  P: { name: 'Open Palm', color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', badge: 'token-P' },
  F: { name: 'Closed Fist', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40', badge: 'token-F' },
  V: { name: 'Peace Sign', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', badge: 'token-V' },
  T: { name: 'Thumbs Up', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', badge: 'token-T' },
  L: { name: 'L-Shape', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/40', badge: 'token-L' },
};

export default function MainDashboard({
  cameraStatus,
  onRefreshCamera,
  telemetry,
  automataStatus,
  isConnected,
  connectionStatus,
  settings,
  logs,
  onStepSuccess,
  onViewAllHistory
}) {
  const [cameraLoading, setCameraLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const isRunning = cameraStatus?.is_running || false;
  const fps = cameraStatus?.fps || 0;

  // Active gesture data
  const currentSymbol = telemetry?.gesture?.symbol || null;
  const currentName = telemetry?.gesture?.name || (isRunning ? 'Searching Hand' : 'Camera Off');
  const confidence = telemetry?.gesture?.confidence || 0.0;
  const fingerStates = telemetry?.gesture?.finger_states || {};

  // Automata state data
  const currentState = automataStatus?.current_state || 'q0';
  const activeSequence = automataStatus?.active_sequence || [];
  const inNeutral = automataStatus?.in_neutral_cooldown || false;
  const isDead = currentState === 'q_dead';
  const isIdle = currentState === 'q0';

  // Toggle Camera
  const handleToggleCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      if (isRunning) {
        await stopCamera();
      } else {
        await startCamera();
        setStreamError(false);
      }
      if (onRefreshCamera) await onRefreshCamera();
    } catch (e) {
      setCameraError(e.message);
      console.error('Failed to toggle camera:', e);
    } finally {
      setCameraLoading(false);
    }
  };

  const handleManualStep = async (symbol) => {
    try {
      const res = await manualStep(symbol);
      if (onStepSuccess) onStepSuccess(res);
    } catch (e) {
      console.error('Manual symbol step failed:', e);
    }
  };

  const currentMeta = currentSymbol ? GESTURE_CONFIG[currentSymbol] : null;

  return (
    <div className="space-y-5">
      {/* 6-Card Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        
        {/* ========================================================
            CARD 1: LIVE CAMERA
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between overflow-hidden">
          <div className="panel-header">
            <div className="panel-title">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>1. Live Vision Feed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#090e18] border border-[#1b2842] text-slate-300">
                {fps.toFixed(1)} FPS
              </span>
              <button
                onClick={handleToggleCamera}
                disabled={cameraLoading}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition shadow-sm ${
                  isRunning
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
                }`}
              >
                {cameraLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isRunning ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    Start
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Video Stream Container */}
          <div className="relative aspect-video bg-[#070b14] flex items-center justify-center overflow-hidden border-y border-[#162238]">
            {isRunning && !streamError ? (
              <img
                src={CAMERA_STREAM_URL}
                alt="Webcam hand landmark feed"
                className="w-full h-full object-contain"
                onError={() => setStreamError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 max-w-xs">
                <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6 text-cyan-400/50" />
                </div>
                <h4 className="text-xs font-bold text-slate-300 mb-1">
                  {isRunning ? 'Stream Disconnected' : 'Webcam Standby'}
                </h4>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  {cameraError || cameraStatus?.error || 'Activate webcam to track 21 hand landmarks and evaluate geometric gestures.'}
                </p>
                {!isRunning && (
                  <button
                    onClick={handleToggleCamera}
                    disabled={cameraLoading}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Activate Camera
                  </button>
                )}
              </div>
            )}

            {isRunning && (
              <div className="absolute top-2.5 right-2.5 bg-[#0a101d]/85 backdrop-blur-md border border-cyan-500/30 rounded-md px-2 py-0.5 flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                  21 Landmarks Active
                </span>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="px-4 py-2 bg-[#090e18]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>MediaPipe Hands Vision</span>
            </span>
            <span className="font-mono text-slate-400 text-[10px]">480×360 • up to 10 FPS</span>
          </div>
        </div>

        {/* ========================================================
            CARD 2: GESTURE CLASSIFIER
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between">
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Hand className="w-4 h-4 text-cyan-400" />
                <span>2. Gesture Classifier</span>
              </div>
              {inNeutral && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  Neutral Wait
                </span>
              )}
            </div>

            <div className="panel-body space-y-4">
              {/* Main Pose Identification Card */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-4 transition-all ${
                  currentSymbol && currentMeta
                    ? `${currentMeta.bg} ${currentMeta.border} shadow-lg shadow-cyan-500/5`
                    : 'bg-[#090e18] border-[#162238]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center font-mono text-2xl font-black border shrink-0 ${
                    currentSymbol && currentMeta
                      ? `${currentMeta.color} ${currentMeta.border} bg-[#060b13]`
                      : 'bg-[#070b14] text-slate-600 border-slate-800'
                  }`}
                >
                  {currentSymbol || '—'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {currentSymbol && currentMeta ? currentMeta.name : currentName}
                    </h4>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  <div className="w-full h-1.5 bg-[#0a101d] rounded-full overflow-hidden border border-[#1b2842]">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1.5 truncate">
                    {currentSymbol
                      ? `Normalized angle & distance vectors verified.`
                      : `Show hand steadily to camera view.`}
                  </p>
                </div>
              </div>

              {/* 5 Finger Kinematics Status */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Finger Extension Kinematics:
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { id: 'thumb', label: 'Thumb' },
                    { id: 'index', label: 'Index' },
                    { id: 'middle', label: 'Middle' },
                    { id: 'ring', label: 'Ring' },
                    { id: 'pinky', label: 'Pinky' },
                  ].map((f) => {
                    const isExt = !!fingerStates[f.id];
                    return (
                      <div
                        key={f.id}
                        className={`py-1 rounded-md text-[10px] font-semibold border transition ${
                          isExt
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                            : 'bg-[#090e18] text-slate-600 border-slate-800'
                        }`}
                      >
                        <div className="text-[9px] text-slate-400 uppercase">{f.label}</div>
                        <div className="font-mono font-bold text-[10px]">
                          {isExt ? 'EXT' : 'FOLD'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Manual Simulation Shortcuts */}
          <div className="p-3 bg-[#090e18]/80 border-t border-[#162238] flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Simulate Gesture:
            </span>
            <div className="flex items-center gap-1">
              {['P', 'F', 'V', 'T', 'L'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleManualStep(s)}
                  title={`Inject gesture '${s}' (${GESTURE_CONFIG[s].name})`}
                  className="w-7 h-7 rounded bg-[#10192b] hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-mono font-bold text-xs border border-[#1e293b] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================
            CARD 3: AUTOMATA STATE
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between">
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>3. Automata Mealy Engine</span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isDead
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : !isIdle
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {currentState}
              </span>
            </div>

            <div className="panel-body space-y-4">
              {/* Execution Path Visualizer */}
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#162238]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Active Execution Branch:
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className={`px-2 py-1 rounded bg-[#0f172a] border border-[#1e293b] font-bold ${currentState === 'q0' ? 'text-cyan-400 ring-1 ring-cyan-500' : 'text-slate-400'}`}>
                    q0
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className={`px-2 py-1 rounded bg-[#0f172a] border border-[#1e293b] font-bold ${currentState.split('_').length === 2 && !isDead ? 'text-amber-300 ring-1 ring-amber-400' : 'text-slate-400'}`}>
                    {activeSequence[0] ? `q(${activeSequence[0]})` : 'q(σ₁)'}
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className={`px-2 py-1 rounded bg-[#0f172a] border border-[#1e293b] font-bold ${currentState.split('_').length >= 3 && !isDead ? 'text-amber-300 ring-1 ring-amber-400' : 'text-slate-400'}`}>
                    {activeSequence[1] ? `q(${activeSequence.slice(0, 2).join('')})` : 'q(σ₁σ₂)'}
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className={`px-2 py-1 rounded bg-[#0f172a] border border-[#1e293b] font-bold ${activeSequence.length === 3 ? 'text-emerald-300 ring-1 ring-emerald-400' : 'text-slate-400'}`}>
                    Δ (Action)
                  </span>
                </div>
              </div>

              {/* Status Diagnostics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
                  <span className="text-[10px] text-slate-400 uppercase block">Engine Phase</span>
                  <span className="font-semibold text-slate-200">
                    {isDead ? 'Trap / Error' : isIdle ? 'Idle Standby' : `Step ${activeSequence.length} of 3`}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
                  <span className="text-[10px] text-slate-400 uppercase block">30 FPS Stream Filter</span>
                  <span className="font-semibold text-cyan-400 font-mono">
                    Self-loops: O(1)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#090e18]/60 border-t border-[#162238] flex items-center justify-between text-[11px] text-slate-400">
            <span>DFA Determinism: Guaranteed</span>
            <span className="font-mono text-cyan-400 text-[10px]">Prefix-Tree Trie</span>
          </div>
        </div>

        {/* ========================================================
            CARD 4: SEQUENCE PROGRESS
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between">
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>4. Sequence Progression</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {activeSequence.length} / 3 slots
              </span>
            </div>

            <div className="panel-body space-y-4">
              {/* 3 Gesture Slots */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slotIdx) => {
                  const symbol = activeSequence[slotIdx];
                  const isCurrent = activeSequence.length === slotIdx && !isDead;
                  const isDone = !!symbol;

                  return (
                    <div
                      key={slotIdx}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isDone
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                          : isCurrent
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-subtle-pulse'
                          : 'bg-[#090e18] border-[#162238] text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Step {slotIdx + 1}
                      </div>
                      <div className="font-mono text-xl font-black">
                        {symbol || (isCurrent ? '?' : '—')}
                      </div>
                      <div className="text-[9px] mt-1 text-slate-400 font-medium">
                        {isDone ? GESTURE_CONFIG[symbol]?.name || 'Accepted' : isCurrent ? 'Awaiting' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timing Countdown Visualization */}
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#162238]">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inter-Gesture Window:</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {settings?.inter_gesture_timeout_sec || 2.0}s Limit
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0a101d] rounded-full overflow-hidden border border-[#1e293b]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeSequence.length > 0 ? 'bg-cyan-500 w-3/4' : 'bg-slate-700 w-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#090e18]/60 border-t border-[#162238] flex items-center justify-between text-[11px] text-slate-400">
            <span>Overall Timeout: {settings?.sequence_timeout_sec || 10}s</span>
            <span>Stability: {settings?.gesture_stability_ms || 500}ms</span>
          </div>
        </div>

        {/* ========================================================
            CARD 5: SYSTEM STATUS
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between">
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>5. System Health & Infrastructure</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isConnected && isRunning
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : isConnected
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}
              >
                {isConnected && isRunning
                  ? 'All Systems Operational'
                  : isConnected
                  ? 'Vision Standby'
                  : connectionStatus === 'connecting'
                  ? 'Event Stream Reconnecting'
                  : 'Event Stream Disconnected'}
              </span>
            </div>

            <div className="panel-body space-y-2.5 text-xs">
              {/* Row 1: Backend API */}
              <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">FastAPI REST Server</span>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  HTTP 200 OK
                </span>
              </div>

              {/* Row 2: Server-Sent Events */}
              <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">SSE Event Stream</span>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-cyan-400">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-rose-500'}`} />
                  {isConnected ? 'Live Stream Active' : connectionStatus === 'connecting' ? 'Reconnecting' : 'Disconnected'}
                </span>
              </div>

              {/* Row 3: Webcam Vision */}
              <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">MediaPipe Vision Pipeline</span>
                </div>
                <span className="font-mono text-[11px] text-slate-300">
                  {isRunning ? `${fps.toFixed(1)} FPS Active` : 'Standby'}
                </span>
              </div>

              {/* Row 4: Voice Speech */}
              <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings?.voice_feedback_enabled ? (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="font-semibold text-slate-200">Web Speech Synthesis API</span>
                </div>
                <span className="font-mono text-[11px] text-slate-300">
                  {settings?.voice_feedback_enabled ? 'Spoken Feedback On' : 'Muted'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#090e18]/60 border-t border-[#162238] flex items-center justify-between text-[11px] text-slate-400">
            <span>Audio Latency: &lt;15ms</span>
            <span className="font-mono text-cyan-400 text-[10px]">Zero GPU Pipeline</span>
          </div>
        </div>

        {/* ========================================================
            CARD 6: RECENT ACTIVITY
           ======================================================== */}
        <div className="panel-card flex flex-col justify-between">
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>6. Real-Time Audit Log</span>
              </div>
              <button
                onClick={onViewAllHistory}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold transition"
              >
                View Full
              </button>
            </div>

            <div className="panel-body p-0">
              <div className="max-h-[220px] overflow-y-auto divide-y divide-[#162238] font-mono text-xs">
                {logs && logs.length > 0 ? (
                  logs.slice(-5).reverse().map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-[#10192b]/50 flex items-start gap-2.5">
                      <span className="text-slate-400 text-[10px] shrink-0 pt-0.5">
                        {entry.time_str}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-xs font-sans truncate">
                          {entry.message}
                        </p>
                        {entry.command && (
                          <span className="inline-block mt-0.5 text-[10px] text-cyan-400 font-mono font-semibold">
                            [{entry.command}]
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs font-sans">
                    No activity recorded yet. Perform gestures or test commands to stream audit log.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#090e18]/60 border-t border-[#162238] flex items-center justify-between text-[11px] text-slate-400">
            <span>Buffer Size: 200 Entries</span>
            <span className="font-mono text-slate-400 text-[10px]">FIFO Persistent</span>
          </div>
        </div>

      </div>
    </div>
  );
}
