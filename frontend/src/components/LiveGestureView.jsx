import React, { useState } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Zap,
  Hand,
  CheckCircle2,
  Clock,
  Info,
  Play,
  RotateCcw
} from 'lucide-react';
import { startCamera, stopCamera, manualStep, resetAutomata, CAMERA_STREAM_URL } from '../services/api';

const GESTURE_DOCS = [
  { symbol: 'P', name: 'Open Palm', desc: 'All 5 fingers extended outward away from wrist. Used for SOS start and Audio Mute.' },
  { symbol: 'F', name: 'Closed Fist', desc: 'All fingers curled tightly into palm. Used for Screen Reader start and SOS intermediate.' },
  { symbol: 'V', name: 'Peace Sign', desc: 'Index and Middle fingers extended in V-shape; others folded. Used for SOS final trigger.' },
  { symbol: 'T', name: 'Thumbs Up', desc: 'Thumb extended vertically upward; other 4 fingers folded into fist. Used for Volume controls.' },
  { symbol: 'L', name: 'L-Shape', desc: 'Thumb extended horizontally, Index pointing vertically (~90° angle). Used for Screenshot.' },
];

export default function LiveGestureView({
  cameraStatus,
  onRefreshCamera,
  telemetry,
  automataStatus,
  onStepSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const isRunning = cameraStatus?.is_running || false;
  const fps = cameraStatus?.fps || 0;

  const currentSymbol = telemetry?.gesture?.symbol || null;
  const currentName = telemetry?.gesture?.name || (isRunning ? 'Searching Hand' : 'Camera Off');
  const confidence = telemetry?.gesture?.confidence || 0.0;
  const fingerStates = telemetry?.gesture?.finger_states || {};
  const activeSequence = automataStatus?.active_sequence || [];
  const inNeutral = automataStatus?.in_neutral_cooldown || false;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await stopCamera();
      } else {
        await startCamera();
        setStreamError(false);
      }
      if (onRefreshCamera) await onRefreshCamera();
    } catch (e) {
      console.error('Camera toggle error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStep = async (symbol) => {
    try {
      const res = await manualStep(symbol);
      if (onStepSuccess) onStepSuccess(res);
    } catch (e) {
      console.error('Step failed:', e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Columns: Large Live Webcam Stream */}
      <div className="lg:col-span-7 space-y-4">
        <div className="panel-card overflow-hidden">
          <div className="panel-header">
            <div className="panel-title">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Webcam Video Stream (MediaPipe 21 Hand Landmarks)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#090e18] border border-[#1b2842] text-slate-300">
                {fps.toFixed(1)} FPS
              </span>
              <button
                onClick={handleToggle}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition shadow-sm ${
                  isRunning
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isRunning ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> Stop Feed
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Start Feed
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative aspect-video bg-[#070b14] flex items-center justify-center overflow-hidden border-y border-[#162238]">
            {isRunning && !streamError ? (
              <img
                src={CAMERA_STREAM_URL}
                alt="Webcam live hand landmark stream"
                className="w-full h-full object-contain"
                onError={() => setStreamError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7 text-cyan-400/50" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 mb-1">
                  Camera Offline
                </h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Start the webcam to extract 21 three-dimensional landmark points in real time.
                </p>
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-lg text-xs shadow-md hover:brightness-110 transition flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Activate Camera Stream
                </button>
              </div>
            )}

            {isRunning && (
              <div className="absolute top-3 left-3 bg-[#0a101d]/90 backdrop-blur-md border border-cyan-500/40 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                  Vision Engine Tracking
                </span>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-[#090e18]/80 flex items-center justify-between text-xs text-slate-400">
            <span>Normalized Wrist Reference: Joint 0</span>
            <span className="font-mono text-cyan-400 text-[11px]">Sub-pixel Landmark Accuracy</span>
          </div>
        </div>

        {/* Kinematics Telemetry */}
        <div className="panel-card p-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Hand className="w-4 h-4 text-cyan-400" />
            21 Hand Landmark Finger States (Ext / Fold)
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'thumb', label: 'Thumb (Joints 1-4)' },
              { id: 'index', label: 'Index (Joints 5-8)' },
              { id: 'middle', label: 'Middle (Joints 9-12)' },
              { id: 'ring', label: 'Ring (Joints 13-16)' },
              { id: 'pinky', label: 'Pinky (Joints 17-20)' },
            ].map((f) => {
              const isExt = !!fingerStates[f.id];
              return (
                <div
                  key={f.id}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    isExt
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-[#090e18] text-slate-500 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 font-medium truncate">{f.label.split(' ')[0]}</div>
                  <div className="font-mono font-bold text-sm my-0.5">
                    {isExt ? 'EXTENDED' : 'FOLDED'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {f.label.split(' ')[1]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right 5 Columns: Pose Diagnostics & Alphabet Guide */}
      <div className="lg:col-span-5 space-y-4">
        {/* Current Recognized Pose Card */}
        <div className="panel-card p-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Active Pose Recognition
          </h4>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162238]">
            <div className="w-16 h-16 rounded-xl bg-[#060b13] border border-cyan-500/40 text-cyan-400 font-mono text-3xl font-black flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
              {currentSymbol || '—'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-base font-bold text-slate-100">{currentName}</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {Math.round(confidence * 100)}% Conf
                </span>
              </div>
              <div className="w-full h-2 bg-[#0a101d] rounded-full overflow-hidden border border-[#1b2842]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Stability: 500ms required</span>
                {inNeutral && <span className="text-blue-400 font-bold">Neutral cooldown</span>}
              </div>
            </div>
          </div>

          {/* Manual Token Step Buttons */}
          <div className="mt-4 pt-3 border-t border-[#162238]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Manual Gesture Injection (Simulator / Testing):
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {['P', 'F', 'V', 'T', 'L'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleStep(sym)}
                  className="py-2 rounded-lg bg-[#10192b] hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-mono font-bold text-xs border border-[#1e293b] transition shadow-sm"
                >
                  Step {sym}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alphabet Guide */}
        <div className="panel-card p-5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-cyan-400" />
            Alphabet Reference Guide (Σ = &#123;P, F, V, T, L&#125;)
          </h4>
          <div className="space-y-2">
            {GESTURE_DOCS.map((g) => (
              <div
                key={g.symbol}
                className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238] flex items-start gap-3 text-xs"
              >
                <div className="w-7 h-7 rounded bg-[#10192b] text-cyan-400 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-cyan-800/40">
                  {g.symbol}
                </div>
                <div>
                  <span className="font-bold text-slate-200">{g.name}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
