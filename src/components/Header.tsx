import React from 'react';
import { Play, Pause, Bot, LogIn, LogOut, User as UserIcon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeView: 'dashboard' | 'radar' | 'balancer' | 'webterminal' | 'script' | 'chat';
  setActiveView: (view: 'dashboard' | 'radar' | 'balancer' | 'webterminal' | 'script' | 'chat') => void;
  isRunning: boolean;
  onToggleRun: () => void;
  countdown: number;
  asianSessionActive: boolean;
  asianAlertTriggered: boolean;
  onDismissAsianAlert: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  onOpenScriptModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  isRunning,
  onToggleRun,
  countdown,
  asianSessionActive,
  asianAlertTriggered,
  onDismissAsianAlert,
  soundEnabled,
  onToggleSound,
  speed,
  onChangeSpeed,
  onOpenScriptModal,
}) => {
  const { user, dbUser, signInWithGoogle, logout, loading } = useAuth();

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/95 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-neutral-100 whitespace-nowrap shrink-0 hover:text-white transition-colors"
        >
          MCLLC MT5 Terminal
        </a>
        <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="MT5 Bridge & Cloud SQL Connected" />
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'dashboard' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('webterminal')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'webterminal' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span>Web Terminal</span>
        </button>
        <button
          onClick={() => setActiveView('radar')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'radar' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Market Radar
        </button>
        <button
          onClick={() => setActiveView('balancer')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'balancer' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Risk Balancer
        </button>
        <button
          onClick={() => setActiveView('chat')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'chat' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Quant Chat</span>
        </button>
        <button
          onClick={() => {
            setActiveView('script');
            onOpenScriptModal();
          }}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeView === 'script' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          <span>Deriv Bridge</span>
        </button>
      </nav>

      {/* Zone 3: Primary action + Auth profile + PWA Install */}
      <div className="flex items-center gap-3 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />
        {/* Google Authentication Control */}
        {!loading && (
          user ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-sky-400" />
              )}
              <span className="font-medium text-neutral-200 hidden lg:inline truncate max-w-[120px]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <button
                onClick={logout}
                className="text-neutral-400 hover:text-rose-400 transition-colors ml-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-md transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Sign-In</span>
            </button>
          )
        )}

        {/* Engine Start / Pause Button */}
        <button
          onClick={onToggleRun}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Bot</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Bot</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
