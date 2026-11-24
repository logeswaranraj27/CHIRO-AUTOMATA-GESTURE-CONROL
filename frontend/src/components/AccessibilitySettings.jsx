import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  ShieldAlert,
  Clock,
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  AppWindow
} from 'lucide-react';
import { updateSettings } from '../services/api';

export default function AccessibilitySettings({ settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setSaveSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettings(formData);
      if (onSettingsUpdated) onSettingsUpdated(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Voice Feedback */}
        <div className="panel-card p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#162238]">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1. Voice & Speech Feedback (Web Speech API)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">Non-blocking Speech Queue</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Toggle Switch */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Spoken Progress Announcements
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Announces recognized gestures and command events eyes-free.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.voice_feedback_enabled}
                  onChange={(e) => handleChange('voice_feedback_enabled', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-300">
                  {formData.voice_feedback_enabled ? 'Speech Synthesis Active' : 'Muted'}
                </span>
              </label>
            </div>

            {/* Speech Rate Slider */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Speech Rate</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{formData.speech_rate}x</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Controls speed of voice confirmation.</p>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={formData.speech_rate}
                onChange={(e) => handleChange('speech_rate', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.6x Slow</span>
                <span>1.0x Normal</span>
                <span>1.8x Fast</span>
              </div>
            </div>

            {/* Speech Volume Slider */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Voice Volume</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{Math.round(formData.speech_volume * 100)}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Output volume for synthesized announcements.</p>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.speech_volume}
                onChange={(e) => handleChange('speech_volume', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10% Low</span>
                <span>100% Max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Timing & Debounce */}
        <div className="panel-card p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#162238]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Gesture Debounce &amp; Automata Timing Engine
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">Millisecond Precision Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stability Duration */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Gesture Stability Duration</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{formData.gesture_stability_ms} ms</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Hand must remain steadily in pose before being registered as an automata input.
              </p>
              <input
                type="range"
                min="200"
                max="1200"
                step="50"
                value={formData.gesture_stability_ms}
                onChange={(e) => handleChange('gesture_stability_ms', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>200ms Fast</span>
                <span>500ms Default</span>
                <span>1200ms High Tremor Filter</span>
              </div>
            </div>

            {/* Neutral Interval */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Neutral Release Interval</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{formData.neutral_interval_ms} ms</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                User must relax hand/release pose between consecutive gestures.
              </p>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={formData.neutral_interval_ms}
                onChange={(e) => handleChange('neutral_interval_ms', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>100ms Minimal</span>
                <span>300ms Recommended</span>
                <span>800ms Extended</span>
              </div>
            </div>

            {/* Inter-Gesture Timeout */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Inter-Gesture Timeout Limit</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{formData.inter_gesture_timeout_sec} s</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Maximum allowable pause between steps before sequence resets to q₀.
              </p>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={formData.inter_gesture_timeout_sec}
                onChange={(e) => handleChange('inter_gesture_timeout_sec', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Sequence Overall Timeout */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-200">Total Sequence Time Limit</label>
                <span className="font-mono text-xs text-cyan-400 font-bold">{formData.sequence_timeout_sec} s</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Maximum total elapsed duration to complete all 3 combo steps.
              </p>
              <input
                type="range"
                min="5.0"
                max="25.0"
                step="1.0"
                value={formData.sequence_timeout_sec}
                onChange={(e) => handleChange('sequence_timeout_sec', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Safety & Application Control */}
        <div className="panel-card p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#162238]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                3. Safety Gates &amp; Application Whitelist
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400">Windows OS Protection</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Lock Safety Switch */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238] flex items-start justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Allow Native Windows Workstation Lock
                </label>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  When disabled, System Lock runs safely in simulation mode with visual feedback to prevent accidental developer lockouts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allow_system_lock}
                onChange={(e) => handleChange('allow_system_lock', e.target.checked)}
                className="w-5 h-5 accent-rose-500 rounded cursor-pointer shrink-0 mt-1"
              />
            </div>

            {/* App Launcher Whitelist */}
            <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162238]">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                <AppWindow className="w-3.5 h-3.5 text-cyan-400" />
                Whitelisted Launch Application (Open App Combo)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Executed securely via Windows API without arbitrary shell command injection.
              </p>
              <select
                value={formData.whitelisted_app_path}
                onChange={(e) => handleChange('whitelisted_app_path', e.target.value)}
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="notepad.exe">Notepad (notepad.exe)</option>
                <option value="calc.exe">Calculator (calc.exe)</option>
                <option value="explorer.exe">Windows Explorer (explorer.exe)</option>
                <option value="msedge.exe">Microsoft Edge (msedge.exe)</option>
                <option value="chrome.exe">Google Chrome (chrome.exe)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              Settings successfully saved and active in backend engine!
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              Settings persist across runtime sessions.
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:brightness-95 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Accessibility Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
