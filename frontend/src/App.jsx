import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import MainDashboard from './components/MainDashboard';
import LiveGestureView from './components/LiveGestureView';
import AutomataVisualizer from './components/AutomataVisualizer';
import CommandCenter from './components/CommandCenter';
import ActivityHistory from './components/ActivityHistory';
import AccessibilitySettings from './components/AccessibilitySettings';
import EmergencyModal from './components/EmergencyModal';

import {
  fetchSystemStatus,
  fetchCommands,
  updateCommands,
  fetchSettings,
  fetchActivity,
  resetAutomata
} from './services/api';
import { eventStream } from './services/eventsource';
import { speechManager } from './services/speech';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [eventStatus, setEventStatus] = useState('disconnected');
  const isConnected = eventStatus === 'connected';

  // Core system telemetry and state
  const [telemetry, setTelemetry] = useState(null);
  const [cameraStatus, setCameraStatus] = useState({ is_running: false, fps: 0.0 });
  const [automataStatus, setAutomataStatus] = useState({ current_state: 'q0', active_sequence: [] });
  const [commands, setCommands] = useState([]);
  const [settings, setSettings] = useState({
    voice_feedback_enabled: true,
    speech_rate: 1.0,
    speech_volume: 1.0,
    gesture_stability_ms: 500,
    neutral_interval_ms: 300,
    inter_gesture_timeout_sec: 2.0,
    sequence_timeout_sec: 10.0,
    allow_system_lock: false,
    whitelisted_app_path: 'notepad.exe'
  });
  const [logs, setLogs] = useState([]);

  // Emergency SOS Modal
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Initial load from backend
  const refreshAll = useCallback(async () => {
    try {
      const [statusRes, cmdsRes, settingsRes, logsRes] = await Promise.all([
        fetchSystemStatus(),
        fetchCommands(),
        fetchSettings(),
        fetchActivity(50)
      ]);
      setCameraStatus(statusRes.camera || {});
      setAutomataStatus(statusRes.automata || {});
      setCommands(cmdsRes || []);
      setSettings(settingsRes || {});
      setLogs(logsRes || []);
      speechManager.configure({
        enabled: settingsRes.voice_feedback_enabled,
        rate: settingsRes.speech_rate,
        volume: settingsRes.speech_volume
      });
    } catch (e) {
      console.warn('Initial backend fetch connecting...');
    }
  }, []);

  useEffect(() => {
    refreshAll();

    const unsubStatus = eventStream.subscribeStatus((status) => {
      setEventStatus(status);
      if (status === 'connected') refreshAll();
    });

    const unsubMessages = eventStream.subscribe((msg) => {
      if (!msg) return;

      if (msg.type === 'TELEMETRY') {
        setTelemetry(msg);
        setCameraStatus((prev) => ({
          ...prev,
          fps: msg.fps,
          is_running: msg.camera_running
        }));
        setAutomataStatus((prev) => ({
          ...prev,
          current_state: msg.current_state,
          active_sequence: msg.active_sequence || [],
          in_neutral_cooldown: msg.in_neutral_cooldown || false
        }));
      } else if (msg.type === 'ENGINE_EVENT') {
        const ev = msg.event;
        setAutomataStatus((prev) => ({
          ...prev,
          current_state: ev.current_state,
          active_sequence: ev.sequence_progress || [],
          history: msg.automata?.history || prev.history
        }));

        // Append to logs
        const newLog = {
          id: Date.now() + Math.random(),
          time_str: new Date().toTimeString().split(' ')[0],
          event_type: ev.event_type,
          gesture: ev.symbol,
          state: ev.current_state,
          command: ev.command_name,
          message: ev.voice_feedback || `Automata Event: ${ev.event_type}`
        };
        setLogs((prev) => [...prev, newLog]);

        // Emergency SOS modal trigger
        if (ev.action === 'EMERGENCY_SOS' && msg.action_result) {
          setEmergencyAlert(msg.action_result);
        }
      } else if (msg.type === 'VOICE_FEEDBACK') {
        speechManager.speak(msg.text, msg.priority);
      } else if (msg.type === 'SYSTEM_STATUS') {
        setCameraStatus(msg.camera || {});
        if (!msg.camera?.is_running) {
          setTelemetry((prev) => ({
            ...prev,
            fps: 0.0,
            camera_running: false,
            gesture: {
              symbol: null,
              name: 'Camera Off',
              confidence: 0.0,
              finger_states: {}
            }
          }));
        }
      } else if (msg.type === 'INITIAL_STATE') {
        if (msg.commands) setCommands(msg.commands);
        if (msg.camera) setCameraStatus(msg.camera);
        if (msg.automata) setAutomataStatus(msg.automata);
        if (msg.settings) {
          setSettings(msg.settings);
          speechManager.configure({
            enabled: msg.settings.voice_feedback_enabled,
            rate: msg.settings.speech_rate,
            volume: msg.settings.speech_volume
          });
        }
      }
    });

    eventStream.connect();

    return () => {
      unsubStatus();
      unsubMessages();
      eventStream.close();
    };
  }, [refreshAll]);

  const handleResetAutomata = async () => {
    try {
      await resetAutomata();
      setAutomataStatus((prev) => ({ ...prev, current_state: 'q0', active_sequence: [] }));
    } catch (e) {
      console.error('Failed to reset automata:', e);
    }
  };

  const handleToggleCommand = async (cmdId) => {
    const updated = commands.map((c) => (c.id === cmdId ? { ...c, enabled: !c.enabled } : c));
    try {
      const res = await updateCommands(updated);
      setCommands(res.commands);
    } catch (e) {
      console.error('Failed to toggle command:', e);
    }
  };

  const handleToggleVoice = async () => {
    const nextState = !settings.voice_feedback_enabled;
    const nextSettings = { ...settings, voice_feedback_enabled: nextState };
    setSettings(nextSettings);
    speechManager.configure({ enabled: nextState });
  };

  const handleSettingsUpdated = (newSettings) => {
    setSettings(newSettings);
    speechManager.configure({
      enabled: newSettings.voice_feedback_enabled,
      rate: newSettings.speech_rate,
      volume: newSettings.speech_volume
    });
  };

  const handleStepSuccess = (res) => {
    if (res?.current_state) {
      setAutomataStatus((prev) => ({ ...prev, current_state: res.current_state }));
    }
    if (res?.action_result?.action === 'EMERGENCY_SOS') {
      setEmergencyAlert(res.action_result);
    }
  };

  const currentState = automataStatus?.current_state || 'q0';

  return (
    <div className="main-wrapper bg-[#060b13] text-slate-100 min-h-screen">
      {/* 1. Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentState={currentState}
        isConnected={isConnected}
        connectionStatus={eventStatus}
        cameraRunning={cameraStatus?.is_running}
      />

      {/* 2. Main Content Container (offset by sidebar width) */}
      <div className="content-area">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isConnected={isConnected}
          connectionStatus={eventStatus}
          cameraStatus={cameraStatus}
          currentState={currentState}
          onResetAutomata={handleResetAutomata}
          voiceEnabled={settings.voice_feedback_enabled}
          onToggleVoice={handleToggleVoice}
        />

        {/* Dynamic Section Content */}
        <main className="p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <MainDashboard
              cameraStatus={cameraStatus}
              onRefreshCamera={refreshAll}
              telemetry={telemetry}
              automataStatus={automataStatus}
              isConnected={isConnected}
              connectionStatus={eventStatus}
              settings={settings}
              logs={logs}
              onStepSuccess={handleStepSuccess}
              onViewAllHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'live-detection' && (
            <LiveGestureView
              cameraStatus={cameraStatus}
              onRefreshCamera={refreshAll}
              telemetry={telemetry}
              automataStatus={automataStatus}
              onStepSuccess={handleStepSuccess}
            />
          )}

          {activeTab === 'automata' && (
            <AutomataVisualizer
              currentState={currentState}
              transitionHistory={automataStatus?.history || []}
              onResetAutomata={handleResetAutomata}
            />
          )}

          {activeTab === 'commands' && (
            <CommandCenter
              commands={commands}
              onToggleCommand={handleToggleCommand}
              onStepSuccess={handleStepSuccess}
              onReloadCommands={(newCmds) => setCommands(newCmds)}
            />
          )}

          {activeTab === 'history' && (
            <ActivityHistory logs={logs} onClearLogs={() => setLogs([])} />
          )}

          {activeTab === 'settings' && (
            <AccessibilitySettings
              settings={settings}
              onSettingsUpdated={handleSettingsUpdated}
            />
          )}
        </main>
      </div>

      {/* Emergency Alert Modal */}
      <EmergencyModal
        isOpen={!!emergencyAlert}
        onClose={() => setEmergencyAlert(null)}
        alertDetails={emergencyAlert}
      />
    </div>
  );
}
