import React, { useState } from 'react';
import { Camera, CameraOff, RefreshCw, Zap, Eye, Download } from 'lucide-react';
import { startCamera, stopCamera, CAMERA_STREAM_URL } from '../services/api';

export default function CameraPanel({ cameraStatus, onRefreshStatus }) {
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const isRunning = cameraStatus?.is_running || false;
  const fps = cameraStatus?.fps || 0;

  const handleToggleCamera = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await stopCamera();
      } else {
        await startCamera();
        setStreamError(false);
      }
      if (onRefreshStatus) await onRefreshStatus();
    } catch (e) {
      console.error('Camera toggle error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col">
      <div className="card-header">
        <div className="card-title">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>Live Vision Stream (MediaPipe 21 Landmarks)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {fps.toFixed(1)} FPS
          </span>
          <button
            onClick={handleToggleCamera}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
              isRunning
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold'
            }`}
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isRunning ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Start Camera
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-t border-slate-900">
        {isRunning && !streamError ? (
          <img
            src={CAMERA_STREAM_URL}
            alt="Webcam hand landmark feed"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
              <Camera className="w-8 h-8 text-cyan-400/50" />
            </div>
            <h3 className="text-sm font-bold text-slate-300 mb-1">
              {isRunning ? 'Video Feed Offline' : 'Webcam Standby'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {cameraStatus?.error
                ? cameraStatus.error
                : 'Click "Start Camera" above to activate live MediaPipe landmark detection and gesture compilation.'}
            </p>
            {!isRunning && (
              <button
                onClick={handleToggleCamera}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-lg text-xs shadow-md hover:brightness-110 transition flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                Activate Camera
              </button>
            )}
          </div>
        )}

        {/* Live HUD Floating Tag */}
        {isRunning && (
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono text-cyan-300 font-semibold tracking-wider uppercase">
              Tracking Active
            </span>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hand Skeleton: 21 Landmarks Overlay</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          Format: 480×360 • up to 10fps
        </span>
      </div>
    </div>
  );
}

