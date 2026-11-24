import React from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Camera,
  CameraOff,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const PAGE_TITLES = {
  dashboard: { title: 'Main Dashboard', desc: 'Unified telemetry, vision HUD, automata state, and system health' },
  'live-detection': { title: 'Live Gesture Detection', desc: 'Webcam MediaPipe 21 hand landmarks & Euclidean joint kinematics' },
  automata: { title: 'Automata Visualizer', desc: 'Formal Mealy Machine M = (Q, Σ, Δ, δ, λ, q₀) state transition graph' },
  commands: { title: 'Command Center', desc: 'Manage and test 10 configurable touchless assistive commands' },
  history: { title: 'Activity History', desc: 'Real-time execution log and timestamped automata audit trail' },
  settings: { title: 'Accessibility Settings', desc: 'Configure speech, timing thresholds, safety gates, and timeouts' },
};

export default function TopHeader({
  activeTab,
  setActiveTab,
  isConnected,
  connectionStatus,
  cameraStatus,
  currentState,
  onResetAutomata,
  voiceEnabled,
  onToggleVoice
}) {
  const pageInfo = PAGE_TITLES[activeTab] || PAGE_TITLES.dashboard;
  const isRunning = cameraStatus?.is_running || false;
  const fps = cameraStatus?.fps || 0;

  return (
    <header className="h-16 px-6 bg-[#0a101d]/90 backdrop-blur-md border-b border-[#162238] flex items-center justify-between sticky top-0 z-30">
      {/* Current Page Title & Context */}
      <div>
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>{pageInfo.title}</span>
          <span className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            PROD
          </span>
        </h2>
        <p className="text-[11px] text-slate-400 tracking-tight">
          {pageInfo.desc}
        </p>
      </div>

      {/* Action Controls & Real-Time Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Camera Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
            isRunning
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}
        >
          {isRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">{fps.toFixed(1)} FPS</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <CameraOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Camera Standby</span>
            </>
          )}
        </div>

        {/* Backend Connection Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            isConnected
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-rose-500 animate-pulse'
            }`}
          />
          <span className="text-[11px]">
            {isConnected ? 'Event Stream Connected' : connectionStatus === 'connecting' ? 'Event Stream Reconnecting' : 'Event Stream Disconnected'}
          </span>
        </div>

        {/* Voice Toggle Quick Button */}
        <button
          onClick={onToggleVoice}
          title={voiceEnabled ? 'Mute Voice Feedback' : 'Unmute Voice Feedback'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
            voiceEnabled
              ? 'bg-[#10192b] hover:bg-[#15223a] text-cyan-300 border-cyan-900/60'
              : 'bg-[#10192b] hover:bg-[#15223a] text-slate-400 border-slate-800'
          }`}
        >
          {voiceEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Voice Muted</span>
            </>
          )}
        </button>

        {/* Reset State Button */}
        <button
          onClick={onResetAutomata}
          title="Reset Mealy Machine to initial state (q0)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142036] hover:bg-[#1a2b4a] active:bg-[#0e1829] text-slate-200 border border-[#233555] text-xs font-semibold shadow-sm transition group"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-[-45deg] transition-transform" />
          <span>Reset State</span>
        </button>

        {/* Settings Shortcut */}
        <button
          onClick={() => setActiveTab('settings')}
          title="Open Settings"
          className={`p-2 rounded-lg border transition ${
            activeTab === 'settings'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-[#10192b] hover:bg-[#15223a] text-slate-300 border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
