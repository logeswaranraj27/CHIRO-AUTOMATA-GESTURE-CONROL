import React, { useEffect, useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { fetchAutomataGraph, resetAutomata } from '../services/api';

export default function AutomataVisualizer({ currentState, transitionHistory, onResetAutomata }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await fetchAutomataGraph();
      setGraphData(data);
    } catch (e) {
      console.error('Failed to load automata graph:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const isDead = currentState === 'q_dead';
  const isIdle = currentState === 'q0';

  return (
    <div className="space-y-6">
      {/* Formal Definition Bar */}
      <div className="panel-card p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#162238]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Formal Mealy Transducer Specification: M = (Q, Σ, Δ, δ, λ, q₀)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetAutomata}
              className="px-2.5 py-1 rounded bg-[#10192b] hover:bg-[#162540] text-slate-300 text-xs font-semibold border border-[#1e293b] flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Reset Machine
            </button>
            <button
              onClick={loadGraph}
              disabled={loading}
              className="p-1 rounded bg-[#10192b] hover:bg-[#162540] text-slate-400 hover:text-slate-200 border border-[#1e293b] transition"
              title="Refresh Automata"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">State Set |Q|</span>
            <span className="text-cyan-400 font-bold">{graphData?.Q?.length || 22} States</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Input Alphabet Σ</span>
            <span className="text-slate-200 font-bold">&#123;P, F, V, T, L&#125;</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Output Actions |Δ|</span>
            <span className="text-emerald-400 font-bold">{graphData?.Delta?.length || 10} Actions</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Initial State q₀</span>
            <span className="text-blue-400 font-bold">q0 (Idle)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Trap Dead State</span>
            <span className="text-rose-400 font-bold">q_dead</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-[#162238]">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Current Active State</span>
            <span
              className={`font-bold ${
                isDead ? 'text-rose-400 animate-pulse' : !isIdle ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {currentState}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Interactive State Machine Visualizer */}
      <div className="panel-card overflow-hidden">
        <div className="panel-header">
          <div className="panel-title">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Interactive State Machine Topology (δ: Q × Σ → Q, λ: Q × Σ → Δ)</span>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            Real-time Node Pulse &amp; Transition Highlighting
          </span>
        </div>

        <div className="p-6 bg-[#070b14] flex flex-col items-center justify-center relative overflow-x-auto">
          <svg viewBox="0 0 940 240" className="w-full min-w-[760px] h-auto max-h-[260px]">
            <defs>
              <marker id="arrow-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
              </marker>
              <marker id="arrow-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
              </marker>
              <marker id="arrow-rose" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
              </marker>
              <filter id="glow-active" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Start Arrow into q0 */}
            <path d="M 25 120 L 75 120" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrow-cyan)" />
            <text x="30" y="108" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">
              Start
            </text>

            {/* q0 Idle Node */}
            <g transform="translate(120, 120)">
              <circle
                r="38"
                fill={currentState === 'q0' ? '#083344' : '#0c1626'}
                stroke={currentState === 'q0' ? '#06b6d4' : '#233857'}
                strokeWidth={currentState === 'q0' ? '3.5' : '2'}
                filter={currentState === 'q0' ? 'url(#glow-active)' : 'none'}
              />
              <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="14" fontWeight="bold" fontFamily="JetBrains Mono">
                q₀
              </text>
              <text textAnchor="middle" dy="20" fill="#64748b" fontSize="10">
                Idle
              </text>
            </g>

            {/* Transition 1: q0 -> q(sigma_1) */}
            <path d="M 165 120 L 305 120" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
            <rect x="205" y="102" width="60" height="20" rx="5" fill="#0d182b" stroke="#1f3354" />
            <text x="235" y="116" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
              σ₁ / TTS₁
            </text>

            {/* Step 1 Node */}
            <g transform="translate(350, 120)">
              <circle
                r="36"
                fill={currentState?.startsWith('q_') && currentState.split('_').length === 2 && !isDead ? '#451a03' : '#0c1626'}
                stroke={currentState?.startsWith('q_') && currentState.split('_').length === 2 && !isDead ? '#f59e0b' : '#233857'}
                strokeWidth={currentState?.startsWith('q_') && currentState.split('_').length === 2 && !isDead ? '3.5' : '2'}
                filter={currentState?.startsWith('q_') && currentState.split('_').length === 2 && !isDead ? 'url(#glow-active)' : 'none'}
              />
              <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="JetBrains Mono">
                q(σ₁)
              </text>
              <text textAnchor="middle" dy="20" fill="#94a3b8" fontSize="10">
                Step 1
              </text>

              {/* 30 FPS self loop */}
              <path d="M -16 -32 C -30 -60, 30 -60, 16 -32" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-cyan)" />
              <text x="0" y="-62" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                σ₁ / ε (30 FPS)
              </text>
            </g>

            {/* Transition 2: q(sigma_1) -> q(sigma_1 sigma_2) */}
            <path d="M 395 120 L 535 120" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow-cyan)" />
            <rect x="435" y="102" width="60" height="20" rx="5" fill="#0d182b" stroke="#1f3354" />
            <text x="465" y="116" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
              σ₂ / TTS₂
            </text>

            {/* Step 2 Node */}
            <g transform="translate(580, 120)">
              <circle
                r="36"
                fill={currentState?.split('_').length >= 3 && !isDead ? '#451a03' : '#0c1626'}
                stroke={currentState?.split('_').length >= 3 && !isDead ? '#f59e0b' : '#233857'}
                strokeWidth={currentState?.split('_').length >= 3 && !isDead ? '3.5' : '2'}
                filter={currentState?.split('_').length >= 3 && !isDead ? 'url(#glow-active)' : 'none'}
              />
              <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="JetBrains Mono">
                q(σ₁σ₂)
              </text>
              <text textAnchor="middle" dy="20" fill="#94a3b8" fontSize="10">
                Step 2
              </text>

              {/* 30 FPS self loop */}
              <path d="M -16 -32 C -30 -60, 30 -60, 16 -32" fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow-cyan)" />
              <text x="0" y="-62" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                σ₂ / ε
              </text>
            </g>

            {/* Terminal Return Arc into q0 with Action Lambda */}
            <path d="M 600 90 C 650 15, 230 15, 140 85" fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-emerald)" strokeDasharray="5 3" />
            <rect x="330" y="8" width="160" height="22" rx="5" fill="#064e3b" stroke="#10b981" />
            <text x="410" y="23" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
              σ₃ / Command Trigger (Δ) → q₀
            </text>

            {/* Dead State Trap (q_dead) */}
            <g transform="translate(810, 120)">
              <circle
                r="36"
                fill={isDead ? '#4c0519' : '#0c1626'}
                stroke={isDead ? '#f43f5e' : '#233857'}
                strokeWidth={isDead ? '3.5' : '2'}
                filter={isDead ? 'url(#glow-active)' : 'none'}
              />
              <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="13" fontWeight="bold" fontFamily="JetBrains Mono">
                q_dead
              </text>
              <text textAnchor="middle" dy="20" fill="#f43f5e" fontSize="10">
                Trap Error
              </text>
              {/* Trap self loop */}
              <path d="M -16 -32 C -30 -60, 30 -60, 16 -32" fill="none" stroke="#f43f5e" strokeWidth="1.5" markerEnd="url(#arrow-rose)" />
              <text x="0" y="-62" textAnchor="middle" fill="#fb7185" fontSize="9" fontFamily="JetBrains Mono">
                Σ / ε
              </text>
            </g>

            {/* Error Edge into q_dead */}
            <path d="M 615 138 L 765 138" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#arrow-rose)" />
            <text x="690" y="132" textAnchor="middle" fill="#fb7185" fontSize="10" fontFamily="JetBrains Mono">
              Invalid Symbol
            </text>
          </svg>
        </div>
      </div>

      {/* Transition Log Table */}
      <div className="panel-card overflow-hidden">
        <div className="panel-header">
          <div className="panel-title">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Formal Mealy State Transition Log (Evaluated δ and λ Outputs)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Real-Time Execution History
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto font-mono text-xs">
          {transitionHistory && transitionHistory.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-[#090e18] text-slate-400 text-[11px] uppercase sticky top-0 border-b border-[#162238]">
                <tr>
                  <th className="p-3 pl-4">Source State (q)</th>
                  <th className="p-3">Input Symbol (σ)</th>
                  <th className="p-3">Target State (q')</th>
                  <th className="p-3">Output Action (λ)</th>
                  <th className="p-3 pr-4">Voice Synthesis Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162238]">
                {transitionHistory.slice().reverse().map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#10192b]/50 transition">
                    <td className="p-3 pl-4 text-cyan-300 font-bold">{t.from_state}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#10192b] text-amber-300 border border-amber-900/40 font-bold">
                        {t.symbol}
                      </span>
                    </td>
                    <td className="p-3 text-cyan-300 font-bold">{t.to_state}</td>
                    <td className="p-3">
                      <span className={t.action ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {t.action || 'ε (Null)'}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-slate-300 truncate max-w-sm">
                      {t.feedback || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No transitions recorded yet. Perform gestures or click manual step buttons.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
