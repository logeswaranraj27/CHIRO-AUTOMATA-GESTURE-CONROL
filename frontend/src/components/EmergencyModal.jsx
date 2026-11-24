import React from 'react';
import { ShieldAlert, BellRing, X, AlertTriangle } from 'lucide-react';

export default function EmergencyModal({ isOpen, onClose, alertDetails }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-[#1c080d] border-2 border-rose-500 rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.4)] text-center relative space-y-5">
        {/* Close Icon in corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Emergency Icon */}
        <div className="w-18 h-18 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto shadow-[0_0_25px_#f43f5e]" style={{ width: '72px', height: '72px' }}>
          <ShieldAlert className="w-10 h-10 text-rose-400 animate-bounce" />
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase px-2.5 py-1 rounded bg-rose-950/80 border border-rose-800/60 inline-block mb-2">
            Priority Alert Triggered
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-rose-100 tracking-wide uppercase">
            {alertDetails?.modal_title || 'EMERGENCY SOS BEACON ACTIVATED'}
          </h2>
          <p className="text-xs text-rose-200/80 mt-2 leading-relaxed">
            {alertDetails?.modal_message ||
              'Touchless 3-step sequence confirmed: Open Palm (P) → Closed Fist (F) → Peace Sign (V). Simulated emergency protocol dispatched.'}
          </p>
        </div>

        <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center justify-center gap-2">
          <BellRing className="w-4 h-4 animate-spin text-rose-400" />
          <span>Status: SIMULATED ASSISTIVE PROTOCOL (No 911 dispatch)</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:brightness-110 active:brightness-95 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition tracking-wide"
        >
          Acknowledge &amp; Dismiss Emergency Alert
        </button>
      </div>
    </div>
  );
}
