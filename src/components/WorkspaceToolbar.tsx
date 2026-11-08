import React from 'react';
import { Volume2, VolumeX, RotateCw, Globe, Clock, Bell, Sparkles, Server } from 'lucide-react';

interface WorkspaceToolbarProps {
  countdown: number;
  pollInterval: number;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  onForceEvaluation: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  asianSessionActive: boolean;
  asianAlertTriggered: boolean;
  onDismissAsianAlert: () => void;
  utcTime: string;
  bridgeConnected?: boolean;
  bridgeLatency?: number | null;
  useLiveBridge?: boolean;
  onOpenBridgeModal?: () => void;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  countdown,
  pollInterval,
  speed,
  onChangeSpeed,
  onForceEvaluation,
  soundEnabled,
  onToggleSound,
  asianSessionActive,
  asianAlertTriggered,
  onDismissAsianAlert,
  utcTime,
  bridgeConnected = false,
  bridgeLatency = null,
  useLiveBridge = false,
  onOpenBridgeModal,
}) => {
  const progress = Math.max(0, Math.min(100, ((pollInterval - countdown) / pollInterval) * 100));

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* 30s Loop Countdown & Trigger */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 flex items-center justify-center font-mono font-bold text-[11px] text-sky-400">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-sky-400 transition-all duration-300"
                strokeDasharray={`${progress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute">{Math.ceil(countdown)}</span>
          </div>
          <div>
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Evaluation Loop</div>
            <div className="font-mono text-neutral-200 text-xs font-semibold">
              30s Polling Cycle
            </div>
          </div>
        </div>

        <button
          onClick={onForceEvaluation}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors"
          title="Force evaluate sub-candles now"
        >
          <RotateCw className="w-3 h-3 text-sky-400" />
          <span>Eval Now</span>
        </button>

        {/* Speed Controls */}
        <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 font-mono text-[11px]">
          <span className="text-neutral-500 px-1.5 text-[10px]">Speed:</span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                speed === s
                  ? 'bg-neutral-800 text-sky-400 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Deriv MT5 Bridge Quick Switch & Status */}
        {onOpenBridgeModal && (
          <button
            onClick={onOpenBridgeModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded border transition-colors bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300"
            title="Configure Deriv MT5 FastAPI Bridge"
          >
            <Server className="w-3 h-3 text-sky-400" />
            <span className="text-neutral-400">Bridge:</span>
            <span
              className={
                bridgeConnected
                  ? useLiveBridge
                    ? 'text-emerald-400 font-semibold'
                    : 'text-sky-400 font-medium'
                  : 'text-neutral-500'
              }
            >
              {bridgeConnected
                ? useLiveBridge
                  ? `Live (${bridgeLatency ?? 0}ms)`
                  : 'Connected'
                : 'Offline'}
            </span>
          </button>
        )}
      </div>

      {/* Asian Session & World Clocks */}
      <div className="flex items-center gap-4">
        {/* Real Financial Sessions */}
        <div className="hidden lg:flex items-center gap-2.5 font-mono text-[11px] text-neutral-400">
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-300 font-semibold">UTC: {utcTime}</span>
          </div>
          <span className="text-neutral-700">·</span>
          <span className={asianSessionActive ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
            Tokyo/Asia {asianSessionActive ? '(Open)' : '(Closed)'}
          </span>
          <span className="text-neutral-700">·</span>
          <span className={parseInt(utcTime.split(':')[0] || '0', 10) >= 8 && parseInt(utcTime.split(':')[0] || '0', 10) < 17 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
            London {parseInt(utcTime.split(':')[0] || '0', 10) >= 8 && parseInt(utcTime.split(':')[0] || '0', 10) < 17 ? '(Open)' : '(Closed)'}
          </span>
          <span className="text-neutral-700">·</span>
          <span className={parseInt(utcTime.split(':')[0] || '0', 10) >= 13 && parseInt(utcTime.split(':')[0] || '0', 10) < 22 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
            New York {parseInt(utcTime.split(':')[0] || '0', 10) >= 13 && parseInt(utcTime.split(':')[0] || '0', 10) < 22 ? '(Open)' : '(Closed)'}
          </span>
        </div>

        {/* Real Asian Session Alert Flag */}
        {asianAlertTriggered && (
          <div className="flex items-center gap-2 bg-purple-950/70 border border-purple-700 text-purple-300 px-2.5 py-1 rounded text-xs animate-pulse">
            <Bell className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold">Asian Session Open Alert (00:00 UTC)</span>
            <button
              onClick={onDismissAsianAlert}
              className="ml-1 text-purple-400 hover:text-purple-100 text-[10px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 text-neutral-400 hover:text-neutral-100 bg-neutral-800/80 hover:bg-neutral-800 rounded border border-neutral-700/80 transition-colors"
          title={soundEnabled ? 'Mute Audio Alerts' : 'Unmute Audio Alerts'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
          )}
        </button>
      </div>
    </div>
  );
};
