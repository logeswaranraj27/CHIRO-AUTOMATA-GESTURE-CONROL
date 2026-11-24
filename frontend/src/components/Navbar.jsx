import React from 'react';
import { Activity, Camera, Cpu, Settings, Volume2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  isConnected,
  currentState,
  onResetAutomata,
  voiceEnabled
}) {
  const isDeadState = currentState === 'q_dead';
  const isIdle = currentState === 'q0';

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                CHIRO-AUTOMATA
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                TOC Transducer
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Touchless Assistive Gesture-to-Command Compiler
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-4">
          {/* State Badge */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">State:</span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                isDeadState
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : !isIdle
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {currentState || 'q0'}
            </span>
          </div>

          {/* WS Connection Pill */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? 'Backend Connected' : 'Reconnecting...'}
            </span>
          </div>

          {/* Quick Automata Reset */}
          <button
            onClick={onResetAutomata}
            title="Reset Mealy Machine to Initial State (q0)"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            Reset State
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Main Dashboard', icon: Activity },
          { id: 'automata', label: 'Automata Visualizer', icon: Cpu },
          { id: 'commands', label: 'Command Center', icon: ShieldCheck },
          { id: 'history', label: 'Activity History', icon: Activity },
          { id: 'settings', label: 'Accessibility Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

