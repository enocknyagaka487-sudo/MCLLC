import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types/trading';
import { Terminal, Copy, Trash2, Check, Filter } from 'lucide-react';

interface ExecutionConsoleProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filterType === 'ALL' ? logs : logs.filter((l) => l.type === filterType);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const handleCopy = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'EXECUTION':
        return 'text-sky-400';
      case 'RISK':
        return 'text-amber-400';
      case 'TARGET':
        return 'text-emerald-400 font-bold';
      case 'ALERT':
        return 'text-purple-400';
      case 'SYSTEM':
        return 'text-neutral-400';
      default:
        return 'text-neutral-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-[11px]">
        <div className="flex items-center gap-2 text-neutral-300">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">MCLLC Execution Console</span>
          <span className="text-neutral-500 font-mono">({filteredLogs.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            {['ALL', 'EXECUTION', 'RISK', 'TARGET', 'ALERT'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  filterType === t
                    ? 'bg-neutral-800 text-neutral-100 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClearLogs}
            className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 max-h-[300px] bg-neutral-950">
        {filteredLogs.length === 0 ? (
          <div className="text-neutral-600 italic">No events logged yet. Starting evaluation loop...</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2 break-all">
              <span className="text-neutral-600 shrink-0 text-[10px] select-none">
                [{log.timestamp}]
              </span>
              <span className={`text-[11px] ${getTypeColor(log.type)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
