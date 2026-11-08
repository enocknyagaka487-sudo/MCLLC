import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  CheckCircle2,
  Activity,
  Server,
  Zap,
  RefreshCw,
  Send,
  AlertTriangle,
  Radio,
  Eye,
  EyeOff,
  Sliders,
} from 'lucide-react';
import {
  MAGIC_NUMBER,
  DEFAULT_LOT_SIZE,
  MAX_SUB_TRADES,
  TARGET_PROFIT_PERCENT,
  POLL_INTERVAL_SEC,
  SYMBOLS,
} from '../utils/constants';
import { getDerivFastApiBridgeScript, getPythonScript } from '../utils/pythonScriptTemplate';
import { BridgeConfig } from '../types/trading';

interface Mt5BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bridgeConfig: BridgeConfig;
  setBridgeConfig: React.Dispatch<React.SetStateAction<BridgeConfig>>;
  onTestConnection: () => Promise<void>;
  onExecuteTestTrade?: (symbol: string, orderType: 'BUY' | 'SELL') => Promise<void>;
  isTestingConnection?: boolean;
}

export const Mt5BridgeModal: React.FC<Mt5BridgeModalProps> = ({
  isOpen,
  onClose,
  bridgeConfig,
  setBridgeConfig,
  onTestConnection,
  onExecuteTestTrade,
  isTestingConnection = false,
}) => {
  const [activeTab, setActiveTab] = useState<'fastapi' | 'diagnostic' | 'standalone'>('fastapi');
  const [copied, setCopied] = useState(false);
  const [copiedRequirements, setCopiedRequirements] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testSymbol, setTestSymbol] = useState('XAUUSD');
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  // Generate customized FastAPI Python code
  const fastApiScript = getDerivFastApiBridgeScript({
    loginId: bridgeConfig.loginId,
    password: bridgeConfig.password,
    server: bridgeConfig.server,
    port: bridgeConfig.port || 8000,
    magicNumber: MAGIC_NUMBER,
    defaultLotSize: DEFAULT_LOT_SIZE,
    maxSubTrades: MAX_SUB_TRADES,
    targetProfitPercent: TARGET_PROFIT_PERCENT,
  });

  // Standalone script
  const standaloneScript = getPythonScript(
    MAGIC_NUMBER,
    DEFAULT_LOT_SIZE,
    MAX_SUB_TRADES,
    TARGET_PROFIT_PERCENT,
    POLL_INTERVAL_SEC
  );

  const activeScript = activeTab === 'standalone' ? standaloneScript : fastApiScript;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRequirements = () => {
    const reqs = `MetaTrader5>=5.0.45\nfastapi>=0.110.0\nuvicorn>=0.28.0\npydantic>=2.6.0\npandas>=2.2.0\nnumpy>=1.26.0`;
    navigator.clipboard.writeText(reqs);
    setCopiedRequirements(true);
    setTimeout(() => setCopiedRequirements(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'standalone' ? 'mcllc_standalone_bot.py' : 'mcllc_deriv_bridge.py';
    const blob = new Blob([activeScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunTestTrade = async (type: 'BUY' | 'SELL') => {
    if (!onExecuteTestTrade) return;
    setIsExecutingTest(true);
    setTestResult(null);
    try {
      await onExecuteTestTrade(testSymbol, type);
      setTestResult(`[SUCCESS] 4x nano-trades executed for ${testSymbol} (${type})`);
    } catch (err: any) {
      setTestResult(`[ERROR] ${err.message || 'Execution failed'}`);
    } finally {
      setIsExecutingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950/80 text-sky-400 border border-sky-800/60 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">Deriv MT5 FastAPI Bridge Station</h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    bridgeConfig.isConnected
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {bridgeConfig.isConnected ? 'Bridge Online' : 'Bridge Offline'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Institutional 4x nano-trade execution microservice for Deriv-Demo & Deriv-Server
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-800 bg-neutral-950/60 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('fastapi')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'fastapi'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>FastAPI Bridge Server (.py)</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'diagnostic'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Connection & Live Testing</span>
          </button>
          <button
            onClick={() => setActiveTab('standalone')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'standalone'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Standalone Polling Bot (.py)</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'fastapi' && (
            <>
              {/* Account / Server Config Form */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>Deriv MT5 Credentials & Server Configuration</span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Values update the generated Python script in real-time
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">Login ID</label>
                    <input
                      type="number"
                      value={bridgeConfig.loginId || ''}
                      onChange={(e) =>
                        setBridgeConfig((prev) => ({ ...prev, loginId: Number(e.target.value) || 0 }))
                      }
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                      placeholder="e.g. 10928341"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={bridgeConfig.password}
                        onChange={(e) =>
                          setBridgeConfig((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 font-mono text-neutral-100 focus:outline-none focus:border-sky-500 pr-8"
                        placeholder="Enter DMT5 password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">Server</label>
                    <select
                      value={bridgeConfig.server}
                      onChange={(e) =>
                        setBridgeConfig((prev) => ({ ...prev, server: e.target.value }))
                      }
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                    >
                      <option value="Deriv-Server">Deriv-Server (Live Account)</option>
                      <option value="Deriv-Demo">Deriv-Demo</option>
                      <option value="Deriv-Server-02">Deriv-Server-02</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">Bridge Port</label>
                    <input
                      type="number"
                      value={bridgeConfig.port}
                      onChange={(e) =>
                        setBridgeConfig((prev) => ({ ...prev, port: Number(e.target.value) || 8000 }))
                      }
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1.5 font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                      placeholder="8000"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      localStorage.setItem(
                        'mcllc_bridge_credentials',
                        JSON.stringify({
                          loginId: bridgeConfig.loginId,
                          password: bridgeConfig.password,
                          server: bridgeConfig.server,
                          port: bridgeConfig.port,
                          url: bridgeConfig.url,
                        })
                      );
                      setSavedNotice(true);
                      setTimeout(() => setSavedNotice(false), 2500);
                    }}
                    className={`text-[11px] font-semibold px-3 py-1 rounded transition-colors border ${
                      savedNotice
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800'
                        : 'text-sky-400 hover:text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border-sky-800/60'
                    }`}
                  >
                    {savedNotice ? 'Credentials Saved to Workspace!' : 'Save Credentials to Workspace'}
                  </button>
                </div>
              </div>

              {/* Instructions checklist */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1. Install Requirements</span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400 break-all">
                    pip install MetaTrader5 fastapi uvicorn pydantic
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>2. MT5 Configuration</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Tools &rarr; Options &rarr; Expert Advisors &rarr; check "Allow Algo Trading".
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>3. Start FastAPI Service</span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400">
                    python mcllc_deriv_bridge.py
                  </p>
                </div>
              </div>

              {/* Action bar for code */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-neutral-200">
                  mcllc_deriv_bridge.py (FastAPI REST Server)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyRequirements}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
                  >
                    {copiedRequirements ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>requirements.txt</span>
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .py</span>
                  </button>
                </div>
              </div>

              {/* Code Viewport */}
              <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
                <pre className="p-4 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-[340px] leading-relaxed select-all">
                  {fastApiScript}
                </pre>
              </div>
            </>
          )}

          {activeTab === 'diagnostic' && (
            <div className="space-y-6">
              {/* Bridge URL & Test Connection */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-sky-400" />
                    <span>Local Bridge Endpoint & Handshake</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      bridgeConfig.isConnected
                        ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400'
                        : 'bg-rose-950/70 border-rose-800 text-rose-400'
                    }`}
                  >
                    {bridgeConfig.isConnected
                      ? `Connected (${bridgeConfig.latencyMs}ms)`
                      : 'Not Reachable'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                      FastAPI Bridge URL
                    </label>
                    <input
                      type="text"
                      value={bridgeConfig.url}
                      onChange={(e) =>
                        setBridgeConfig((prev) => ({ ...prev, url: e.target.value }))
                      }
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-3 py-1.5 font-mono text-xs text-neutral-100 focus:outline-none focus:border-sky-500"
                      placeholder="http://localhost:8000"
                    />
                  </div>
                  <div className="pt-5 flex items-center gap-2">
                    <button
                      onClick={onTestConnection}
                      disabled={isTestingConnection}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                      <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Live Routing Toggle */}
                <div className="flex items-center justify-between p-3 bg-neutral-900/80 border border-neutral-800 rounded">
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">
                      Route Terminal Orders Live to Deriv MT5
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      When enabled, manual buy/sell and bot auto-executions call /execute on the FastAPI bridge
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setBridgeConfig((prev) => ({ ...prev, useLiveBridge: !prev.useLiveBridge }))
                    }
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                      bridgeConfig.useLiveBridge
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {bridgeConfig.useLiveBridge ? 'Live Bridge: ENABLED' : 'Simulated Sandbox'}
                  </button>
                </div>
              </div>

              {/* Live Deriv Account Snapshot */}
              {bridgeConfig.accountInfo && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Deriv MT5 Account Snapshot</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Account Login</div>
                      <div className="font-mono text-neutral-200 font-semibold mt-0.5">
                        #{bridgeConfig.accountInfo.login} ({bridgeConfig.accountInfo.server})
                      </div>
                    </div>
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Balance</div>
                      <div className="font-mono text-neutral-200 font-semibold mt-0.5">
                        ${bridgeConfig.accountInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Equity</div>
                      <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                        ${bridgeConfig.accountInfo.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase">Free Margin</div>
                      <div className="font-mono text-neutral-200 font-semibold mt-0.5">
                        ${bridgeConfig.accountInfo.free_margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Order Dispatcher */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Manual Test Nano-Trade Dispatcher (4x {DEFAULT_LOT_SIZE} Lot)</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={testSymbol}
                    onChange={(e) => setTestSymbol(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700/80 rounded px-3 py-1.5 font-mono text-xs text-neutral-100 focus:outline-none focus:border-sky-500"
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleRunTestTrade('BUY')}
                    disabled={isExecutingTest}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {isExecutingTest ? 'Sending...' : 'Test 4x BUY'}
                  </button>

                  <button
                    onClick={() => handleRunTestTrade('SELL')}
                    disabled={isExecutingTest}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {isExecutingTest ? 'Sending...' : 'Test 4x SELL'}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded text-xs font-mono border ${
                      testResult.startsWith('[SUCCESS]')
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'standalone' && (
            <>
              {/* Quick Setup Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1. Dependencies</span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400">
                    pip install MetaTrader5 pandas numpy
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>2. MT5 Setup</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Check "Allow Algo Trading" in MT5 Expert Advisors settings.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="text-xs font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>3. Run Bot Loop</span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400">
                    python mcllc_standalone_bot.py
                  </p>
                </div>
              </div>

              {/* Action bar for code */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-neutral-200">
                  mcllc_standalone_bot.py ({SYMBOLS.length} Symbols Configured)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .py</span>
                  </button>
                </div>
              </div>

              {/* Code Viewport */}
              <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
                <pre className="p-4 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  {standaloneScript}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <span>Magic: {MAGIC_NUMBER} &middot; Sub-trades: {MAX_SUB_TRADES}x {DEFAULT_LOT_SIZE} &middot; Target: 10%</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
