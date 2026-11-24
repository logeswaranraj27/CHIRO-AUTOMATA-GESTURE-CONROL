import React from 'react';
import {
  LayoutDashboard,
  Scan,
  Cpu,
  Terminal,
  History,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'live-detection', label: 'Live Gesture Detection', icon: Scan, badge: 'Live' },
  { id: 'automata', label: 'Automata Visualizer', icon: Cpu, badge: 'TOC' },
  { id: 'commands', label: 'Command Center', icon: Terminal, badge: '10' },
  { id: 'history', label: 'Activity History', icon: History, badge: null },
  { id: 'settings', label: 'Accessibility Settings', icon: Settings, badge: null },
];

export default function Sidebar({ activeTab, setActiveTab, currentState, isConnected, connectionStatus, cameraRunning }) {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-[#0a101d] border-r border-[#162238] flex flex-col z-40 select-none">
      {/* Branding Header */}
      <div className="h-16 px-5 border-b border-[#162238] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <Cpu className="w-5 h-5 text-slate-950 font-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-slate-100 via-sky-100 to-cyan-300 bg-clip-text text-transparent">
                CHIRO
              </span>
              <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                AUTOMATA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              Touchless Assistive Compiler
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#10192b]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      item.badge === 'Live' && cameraRunning
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Automata Status Card at bottom of sidebar */}
      <div className="p-3 border-t border-[#162238] bg-[#070c17]/60">
        <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1b2842]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Mealy State:
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                currentState === 'q_dead'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : currentState !== 'q0'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {currentState || 'q0'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-[#18243c]">
            <span>Model: M=(Q,Σ,Δ,δ,λ,q₀)</span>
            <span className="text-cyan-400 font-bold">Σ=5</span>
          </div>
        </div>

        <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span className="text-[10px] text-slate-400">
              {isConnected ? 'Event Stream Online' : connectionStatus === 'connecting' ? 'Reconnecting...' : 'Event Stream Offline'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
