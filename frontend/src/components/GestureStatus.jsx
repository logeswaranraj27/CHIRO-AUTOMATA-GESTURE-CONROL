import React from 'react';
import { Hand, Sparkles, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { manualStep } from '../services/api';

const GESTURE_META = {
  P: { name: 'Open Palm', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  F: { name: 'Closed Fist', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  V: { name: 'Peace Sign', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  T: { name: 'Thumbs Up', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  L: { name: 'L-Shape', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
};

export default function GestureStatus({ telemetry, automataStatus, onStepSuccess }) {
  const currentSymbol = telemetry?.gesture?.symbol || null;
  const currentName = telemetry?.gesture?.name || 'Searching Hand';
  const confidence = telemetry?.gesture?.confidence || 0.0;
  const fingerStates = telemetry?.gesture?.finger_states || {};
  const activeSequence = automataStatus?.active_sequence || [];
  const inNeutral = automataStatus?.in_neutral_cooldown || false;

  const meta = currentSymbol ? GESTURE_META[currentSymbol] : null;

  const handleManualStep = async (symbol) => {
    try {
      const res = await manualStep(symbol);
      if (onStepSuccess) onStepSuccess(res);
    } catch (e) {
      console.error('Manual step failed:', e);
    }
  };

  return (
    <div className="glass-panel flex flex-col justify-between">
      <div>
        <div className="card-header">
          <div className="card-title">
            <Hand className="w-4 h-4 text-cyan-400" />
            <span>Geometric Gesture Classifier</span>
          </div>
          {inNeutral && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase">
              Neutral Release Wait (300ms)
            </span>
          )}
        </div>

        <div className="card-body">
          {/* Main Detected Gesture Card */}
          <div
            className={`flex items-center gap-5 p-4 rounded-xl border transition-all ${
              currentSymbol && meta
                ? `${meta.bg} ${meta.border} shadow-lg`
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div
              className={`w-18 h-18 rounded-2xl flex items-center justify-center font-mono text-3xl font-black border ${
                currentSymbol && meta
                  ? `${meta.bg} ${meta.color} ${meta.border} shadow-inner`
                  : 'bg-slate-950 text-slate-600 border-slate-800'
              }`}
              style={{ width: '70px', height: '70px' }}
            >
              {currentSymbol || '—'}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-100">
                  {currentSymbol && meta ? meta.name : currentName}
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {Math.round(confidence * 100)}% Conf
                </span>
              </div>

              {/* Confidence Progress Bar */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                {currentSymbol
                  ? 'Symbol validated via 21-joint normalized Euclidean vector analysis.'
                  : 'Position hand steadily in camera view to register posture.'}
              </p>
            </div>
          </div>

          {/* 5 Finger States */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Joint Kinematics:
            </span>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { id: 'thumb', label: 'Thumb' },
                { id: 'index', label: 'Index' },
                { id: 'middle', label: 'Middle' },
                { id: 'ring', label: 'Ring' },
                { id: 'pinky', label: 'Pinky' },
              ].map((f) => {
                const isExtended = !!fingerStates[f.id];
                return (
                  <div
                    key={f.id}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition ${
                      isExtended
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-950/70 text-slate-600 border-slate-900'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">{f.label}</div>
                    <div className="font-mono font-bold text-[11px]">
                      {isExtended ? 'EXT' : 'FOLD'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Sequence Progression */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Sequence Progress:
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {activeSequence.length} / 3 steps
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {[0, 1, 2].map((idx) => {
                const symbol = activeSequence[idx];
                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`flex-1 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition ${
                        symbol
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/50 text-slate-600 border-dashed border-slate-800'
                      }`}
                    >
                      {symbol || (idx + 1).toString()}
                    </div>
                    {idx < 2 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manual / Simulated Gestures Shortcut for Testing */}
      <div className="p-3.5 bg-slate-900/40 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Manual Symbol Step (Simulator / Assistive Click):
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {['P', 'F', 'V', 'T', 'L'].map((sym) => (
            <button
              key={sym}
              onClick={() => handleManualStep(sym)}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 active:text-slate-950 text-slate-200 font-mono font-bold text-xs border border-slate-700 transition"
              title={`Step automata with symbol '${sym}' (${GESTURE_META[sym].name})`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

