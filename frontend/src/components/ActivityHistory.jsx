import React, { useState } from 'react';
import {
  History,
  Trash2,
  Filter,
  Search,
  Download,
  Terminal,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { clearActivity } from '../services/api';

export default function ActivityHistory({ logs, onClearLogs }) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message?.toLowerCase().includes(q);
      const matchCmd = log.command?.toLowerCase().includes(q);
      const matchType = log.event_type?.toLowerCase().includes(q);
      if (!matchMsg && !matchCmd && !matchType) return false;
    }

    if (filter === 'ALL') return true;
    if (filter === 'COMMANDS') return !!log.command || log.event_type === 'COMMAND_FIRED';
    if (filter === 'GESTURES') return log.event_type === 'TRANSITION' || !!log.gesture;
    if (filter === 'ERRORS') return log.event_type === 'ERROR' || log.event_type === 'TIMEOUT';
    return true;
  });

  const handleClear = async () => {
    if (!window.confirm('Clear all activity logs?')) return;
    try {
      await clearActivity();
      if (onClearLogs) onClearLogs();
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chiro_automata_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getBadgeStyle = (type) => {
    if (type === 'COMMAND_FIRED' || type === 'EMERGENCY_SOS') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    if (type === 'ERROR' || type === 'TIMEOUT') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    if (type === 'TRANSITION') return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Controls Bar */}
      <div className="panel-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter audit logs by keyword or command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-[#1e293b] text-xs">
              {['ALL', 'COMMANDS', 'GESTURES', 'ERRORS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    filter === f
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Export & Clear Buttons */}
            <button
              onClick={handleExport}
              title="Download Audit Trail as JSON"
              className="p-1.5 rounded-lg bg-[#10192b] hover:bg-[#162540] text-slate-300 border border-[#1e293b] transition text-xs"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              title="Clear Log Buffer"
              className="p-1.5 rounded-lg bg-[#10192b] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1e293b] transition text-xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="panel-card overflow-hidden">
        <div className="panel-header">
          <div className="panel-title">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Automata Audit Trail &amp; Real-Time Diagnostics</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredLogs.length} Records
          </span>
        </div>

        <div className="max-h-[580px] overflow-y-auto divide-y divide-[#162238] font-mono text-xs">
          {filteredLogs && filteredLogs.length > 0 ? (
            filteredLogs.slice().reverse().map((entry) => (
              <div key={entry.id} className="p-3.5 hover:bg-[#10192b]/50 transition flex items-start gap-3">
                <span className="text-slate-500 text-[11px] shrink-0 pt-0.5">
                  {entry.time_str}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 font-mono ${getBadgeStyle(
                    entry.event_type
                  )}`}
                >
                  {entry.event_type}
                </span>

                <div className="flex-1 text-slate-200 font-sans text-xs min-w-0">
                  <span className="leading-relaxed">{entry.message}</span>
                  {entry.command && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-[#070b14] text-cyan-300 text-[11px] font-mono border border-cyan-900/40 font-bold">
                      {entry.command}
                    </span>
                  )}
                  {entry.state && (
                    <span className="ml-2 text-slate-500 font-mono text-[10px]">
                      State: {entry.state}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs font-sans">
              No matching records found. Perform gestures or execute commands to populate the log.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
