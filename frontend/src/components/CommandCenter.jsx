import React, { useState } from 'react';
import {
  ShieldAlert,
  VolumeX,
  Volume2,
  Volume1,
  Lock,
  Camera,
  BookOpen,
  Square,
  XCircle,
  Play,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { manualStep, updateCommands, resetCommands } from '../services/api';

const ACTION_ICONS = {
  EMERGENCY_SOS: ShieldAlert,
  READ_SCREEN: BookOpen,
  SYSTEM_LOCK: Lock,
  MUTE_AUDIO: VolumeX,
  VOLUME_UP: Volume2,
  VOLUME_DOWN: Volume1,
  SCREENSHOT: Camera,
  OPEN_APPLICATION: Play,
  STOP_READING: Square,
  CANCEL_OPERATION: XCircle
};

const VALID_GESTURES = ['P', 'F', 'V', 'T', 'L'];

export default function CommandCenter({ commands, onToggleCommand, onStepSuccess, onReloadCommands }) {
  const [testingId, setTestingId] = useState(null);
  const [editingCmd, setEditingCmd] = useState(null);
  const [editSeq, setEditSeq] = useState(['P', 'F', 'V']);
  const [editError, setEditError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleTestSequence = async (cmd) => {
    setTestingId(cmd.id);
    try {
      for (const sym of cmd.sequence) {
        const res = await manualStep(sym);
        if (onStepSuccess) onStepSuccess(res);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      console.error('Sequence execution error:', e);
    } finally {
      setTestingId(null);
    }
  };

  const openEditModal = (cmd) => {
    setEditingCmd(cmd);
    setEditSeq([...cmd.sequence]);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (editSeq.length < 2) {
      setEditError('A gesture sequence must contain at least 2 gestures.');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const updated = commands.map((c) =>
        c.id === editingCmd.id ? { ...c, sequence: editSeq } : c
      );
      const res = await updateCommands(updated);
      if (onReloadCommands) onReloadCommands(res.commands);
      setEditingCmd(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update command');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all 10 commands to default gesture sequences?')) return;
    try {
      const res = await resetCommands();
      if (onReloadCommands) onReloadCommands(res.commands);
    } catch (e) {
      console.error('Failed to reset commands:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Directory Header Bar */}
      <div className="panel-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Touchless Command Directory (10 Configurable Combinations)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mealy Machine compiles each enabled gesture branch into deterministic DFA paths.
            </p>
          </div>
          <button
            onClick={handleResetDefaults}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#10192b] hover:bg-[#162540] text-slate-300 border border-[#1e293b] text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            Restore Factory Defaults
          </button>
        </div>
      </div>

      {/* 10 Command Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commands && commands.map((cmd) => {
          const Icon = ACTION_ICONS[cmd.action_type] || Play;
          const isTesting = testingId === cmd.id;

          return (
            <div
              key={cmd.id}
              className={`panel-card p-4 transition-all ${
                cmd.enabled ? 'border-[#1b2842]' : 'opacity-60 border-slate-900 bg-[#070b14]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      cmd.action_type === 'EMERGENCY_SOS'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{cmd.name}</span>
                      {!cmd.enabled && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Disabled
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {cmd.description}
                    </p>
                  </div>
                </div>

                {/* Enable/Disable Toggle Switch */}
                <button
                  onClick={() => onToggleCommand(cmd.id)}
                  title={cmd.enabled ? 'Disable Command' : 'Enable Command'}
                  className="text-slate-400 hover:text-slate-200 transition shrink-0"
                >
                  {cmd.enabled ? (
                    <ToggleRight className="w-7 h-7 text-cyan-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Gesture Sequence Tokens */}
              <div className="mt-4 pt-3 border-t border-[#162238] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {cmd.sequence.map((sym, i) => (
                    <React.Fragment key={i}>
                      <span className="w-7 h-7 rounded-md bg-[#070b14] border border-[#1e293b] text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shadow-inner">
                        {sym}
                      </span>
                      {i < cmd.sequence.length - 1 && (
                        <span className="text-slate-600 text-xs font-bold font-mono">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(cmd)}
                    className="p-1.5 rounded-lg bg-[#10192b] hover:bg-[#15223a] text-slate-400 hover:text-slate-200 border border-[#1e293b] transition text-xs"
                    title="Configure Gesture Combo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleTestSequence(cmd)}
                    disabled={isTesting || !cmd.enabled}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#10192b] hover:bg-[#162540] active:bg-cyan-600 active:text-slate-950 text-slate-300 text-xs font-semibold border border-[#1e293b] transition"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    {isTesting ? 'Running...' : 'Test Combo'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Gesture Sequence Modal */}
      {editingCmd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="panel-card max-w-md w-full p-6 bg-[#0a101d] border-[#1e293b] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#162238]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Configure: {editingCmd.name}
              </h3>
              <button
                onClick={() => setEditingCmd(null)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select 3 sequential gestures for this command. The Mealy Machine verifies non-collision and non-prefix ambiguity.
            </p>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Sequence Slot Picker */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sequence Order:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => (
                  <div key={slot} className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase block font-mono">
                      Step {slot + 1}
                    </label>
                    <select
                      value={editSeq[slot] || 'P'}
                      onChange={(e) => {
                        const next = [...editSeq];
                        next[slot] = e.target.value;
                        setEditSeq(next);
                      }}
                      className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg p-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                    >
                      {VALID_GESTURES.map((g) => (
                        <option key={g} value={g}>
                          {g} ({g === 'P' ? 'Palm' : g === 'F' ? 'Fist' : g === 'V' ? 'Peace' : g === 'T' ? 'Thumb' : 'L-Shape'})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#162238]">
              <button
                onClick={() => setEditingCmd(null)}
                className="px-4 py-2 rounded-lg bg-[#0e1628] hover:bg-[#142038] text-slate-300 text-xs font-semibold border border-[#1e293b] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs hover:brightness-110 transition shadow-md"
              >
                {saving ? 'Compiling DFA...' : 'Save & Recompile Automata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
