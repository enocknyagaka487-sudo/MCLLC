import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Candle,
  Mt5Position,
  AccountState,
  RiskBalancerState,
  LogEntry,
  BotConfig,
  SymbolMeta,
  TechnicalIndicators,
  InstitutionalStructures,
  BridgeConfig,
} from './types/trading';
import {
  SYMBOL_METAS,
  SYMBOLS,
  MAGIC_NUMBER,
  DEFAULT_LOT_SIZE,
  MAX_SUB_TRADES,
  TARGET_PROFIT_PERCENT,
  POLL_INTERVAL_SEC,
} from './utils/constants';
import {
  initializeMarketState,
  advanceSymbolCandle,
  calculatePositionProfit,
} from './utils/mockMarketData';
import {
  calculateIndicators,
  detectInstitutionalStructures,
  evaluateSignals,
} from './utils/technicalAnalysis';
import { soundEngine } from './utils/soundEffects';
import { useAuth } from './context/AuthContext';

import { Header } from './components/Header';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { TargetProgressBanner } from './components/TargetProgressBanner';
import { RiskBalancerWidget } from './components/RiskBalancerWidget';
import { InteractiveChart } from './components/InteractiveChart';
import { ActivePositionsTable } from './components/ActivePositionsTable';
import { SymbolRadar } from './components/SymbolRadar';
import { ExecutionConsole } from './components/ExecutionConsole';
import { Mt5BridgeModal } from './components/Mt5BridgeModal';
import { GeminiChatbot } from './components/GeminiChatbot';
import { Mt5WebTerminal } from './components/Mt5WebTerminal';
import { Bot } from 'lucide-react';

export default function App() {
  const { user, token } = useAuth();

  // Navigation & Modal State
  const [activeView, setActiveView] = useState<'dashboard' | 'radar' | 'balancer' | 'webterminal' | 'script' | 'chat'>('dashboard');
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  // Market & Candle State
  const [candlesMap, setCandlesMap] = useState<Record<string, Candle[]>>(() => initializeMarketState());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('XAUUSD');

  // Bot Engine Configuration
  const [botConfig, setBotConfig] = useState<BotConfig>({
    isRunning: true,
    pollIntervalSec: POLL_INTERVAL_SEC,
    defaultLotSize: DEFAULT_LOT_SIZE,
    maxSubTrades: MAX_SUB_TRADES,
    targetProfitPercent: TARGET_PROFIT_PERCENT,
    magicNumber: MAGIC_NUMBER,
    autoExecute: true,
    soundAlerts: true,
    playbackSpeed: 1,
  });

  const [countdown, setCountdown] = useState<number>(POLL_INTERVAL_SEC);

  // Deriv MT5 FastAPI Bridge State (Persisted in Workspace)
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>(() => {
    try {
      const saved = localStorage.getItem('mcllc_bridge_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          url: parsed.url || 'http://localhost:8000',
          loginId: parsed.loginId || 0,
          password: parsed.password || '',
          server: parsed.server || 'Deriv-Server',
          port: parsed.port || 8000,
          useLiveBridge: Boolean(parsed.loginId),
          isConnected: false,
          latencyMs: null,
          lastPingTime: null,
          accountInfo: null,
        };
      }
    } catch (e) {
      // fallback
    }
    return {
      url: 'http://localhost:8000',
      loginId: 0,
      password: '',
      server: 'Deriv-Server',
      port: 8000,
      useLiveBridge: false,
      isConnected: false,
      latencyMs: null,
      lastPingTime: null,
      accountInfo: null,
    };
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Account State
  const initialBalance = 10000.0;
  const [account, setAccount] = useState<AccountState>({
    balance: initialBalance,
    equity: initialBalance,
    initialBalance,
    targetProfitPercent: TARGET_PROFIT_PERCENT,
    targetEquity: initialBalance * (1 + TARGET_PROFIT_PERCENT),
    targetProfitAmount: initialBalance * TARGET_PROFIT_PERCENT,
    profit: 0.0,
    margin: 0.0,
    freeMargin: initialBalance,
    marginLevel: 0.0,
    peakEquity: initialBalance,
    totalRealizedProfit: 0.0,
    liquidationsCount: 0,
    riskBalanceLiquidationsCount: 0,
  });

  // Open MT5 Positions (nano-trades: 4x 0.05 lot)
  const [positions, setPositions] = useState<Mt5Position[]>([]);

  // Real Asian Session Alert State
  const [asianAlertTriggered, setAsianAlertTriggered] = useState(false);
  const [asianAlertDismissed, setAsianAlertDismissed] = useState(false);

  // Console Logs - Production Workspace
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toISOString().substring(11, 19),
      type: 'SYSTEM',
      message: '[WORKSPACE] MCLLC Algorithmic Station Active.',
    },
    {
      id: 'init-2',
      timestamp: new Date().toISOString().substring(11, 19),
      type: 'INFO',
      message: '[STRATEGY] Multi-Market Engine: 30s Polling Loop | 4x 0.05 Nano-Deals | 10% Target Liquidator.',
    },
    {
      id: 'init-3',
      timestamp: new Date().toISOString().substring(11, 19),
      type: 'RISK',
      message: '[RISK BALANCER] 1 Loss balanced by >=2 Profits with net positive equity -> Batch Liquidation.',
    },
    {
      id: 'init-4',
      timestamp: new Date().toISOString().substring(11, 19),
      type: 'SYSTEM',
      message: '[BRIDGE] Ready for live Deriv MT5 execution. Configure credentials in Deriv Bridge modal.',
    },
  ]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString().substring(11, 19),
        type,
        message,
      },
    ]);
  }, []);

  // Sync with Cloud SQL when user logs in
  useEffect(() => {
    if (!token) return;

    const fetchPersistedAccount = async () => {
      try {
        const res = await fetch('/api/account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const acc = await res.json();
          setAccount((prev) => ({
            ...prev,
            balance: acc.balance,
            equity: acc.equity,
            liquidationsCount: acc.liquidationsCount,
            riskBalanceLiquidationsCount: acc.riskLiquidationsCount,
            totalRealizedProfit: acc.totalRealizedProfit,
            targetEquity: acc.balance * (1 + acc.targetProfitPercent),
            targetProfitAmount: acc.balance * acc.targetProfitPercent,
          }));
          addLog('SYSTEM', `[CLOUD SQL] Loaded persistent account record for ${user?.email}`);
        }
      } catch (err) {
        console.error('Failed to load persisted account:', err);
      }
    };

    fetchPersistedAccount();
  }, [token, user?.email, addLog]);

  // Current UTC time formatted
  const [utcTime, setUtcTime] = useState<string>('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentUtcHour = new Date().getUTCHours();
  const asianSessionActive = currentUtcHour >= 0 && currentUtcHour < 9;

  // Current selected symbol metadata
  const selectedMeta = useMemo(
    () => SYMBOL_METAS.find((m) => m.symbol === selectedSymbol) || SYMBOL_METAS[0],
    [selectedSymbol]
  );

  // Calculate technical indicators and structures for the selected symbol
  const selectedCandles = candlesMap[selectedSymbol] || [];
  const selectedAnalysis = useMemo(() => {
    const calc = calculateIndicators(selectedCandles);
    const structures = detectInstitutionalStructures(selectedCandles, calc.latest);
    return { ...calc, structures };
  }, [selectedCandles]);

  // Aggregate Radar Data for all 10 symbols
  const symbolsData = useMemo(() => {
    return SYMBOL_METAS.map((meta) => {
      const c = candlesMap[meta.symbol] || [];
      const last = c[c.length - 1];
      const prev = c[c.length - 2] || last;
      const price = last ? last.close : meta.defaultPrice;
      const change24h = prev ? ((price - prev.close) / prev.close) * 100 : 0;
      const spread = meta.spreadPips / meta.pipMultiplier;
      const ask = price + spread / 2;
      const bid = price - spread / 2;

      const calc = calculateIndicators(c);
      const structures = detectInstitutionalStructures(c, calc.latest);
      const { shouldBuy, shouldSell } = evaluateSignals(meta.symbol, price, calc.latest, structures);

      return {
        meta,
        price,
        bid,
        ask,
        change24h,
        indicators: calc.latest,
        structures,
        shouldBuy,
        shouldSell,
      };
    });
  }, [candlesMap]);

  // Risk Balancer Computation:
  // if len(losing) >= 1 and len(profitable) >= 2 and sum(p.profit) > 0: Liquidating batch.
  const balancerState: RiskBalancerState = useMemo(() => {
    const losingCount = positions.filter((p) => p.profit < 0).length;
    const profitableCount = positions.filter((p) => p.profit > 0).length;
    const netProfit = positions.reduce((acc, p) => acc + p.profit, 0);
    const isRuleSatisfied = losingCount >= 1 && profitableCount >= 2 && netProfit > 0;

    return {
      losingCount,
      profitableCount,
      netProfit,
      isRuleSatisfied,
    };
  }, [positions]);

  // Persist trade to Cloud SQL
  const persistTradeToCloudSql = useCallback(
    async (trade: {
      symbol: string;
      orderType: string;
      volume: number;
      subTradesCount: number;
      openPrice: number;
      closePrice?: number;
      profitUsd?: number;
      reason?: string;
      batchId?: string;
    }) => {
      if (!token) return;
      try {
        await fetch('/api/trades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(trade),
        });
      } catch (err) {
        console.error('Error persisting trade to Cloud SQL:', err);
      }
    },
    [token]
  );

  // Persist account to Cloud SQL
  const persistAccountToCloudSql = useCallback(
    async (acc: {
      balance: number;
      equity: number;
      liquidationsCount: number;
      riskLiquidationsCount: number;
      totalRealizedProfit: number;
    }) => {
      if (!token) return;
      try {
        await fetch('/api/account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(acc),
        });
      } catch (err) {
        console.error('Error persisting account to Cloud SQL:', err);
      }
    },
    [token]
  );

  // 1. Test Bridge Connection & Ping
  const testBridgeConnection = useCallback(async () => {
    setIsTestingConnection(true);
    const start = Date.now();
    try {
      let data: any = null;
      let latency = 0;

      // Try proxy route first to bypass browser CORS/mixed-content restrictions
      try {
        const proxyRes = await fetch(`/api/bridge/health?bridgeUrl=${encodeURIComponent(bridgeConfig.url)}`);
        data = await proxyRes.json();
        latency = data.latencyMs ?? (Date.now() - start);
      } catch (proxyErr) {
        // Fallback to direct call
        const directRes = await fetch(`${bridgeConfig.url}/health`);
        data = await directRes.json();
        latency = Date.now() - start;
      }

      const isRealBridge = Boolean(
        data &&
        (data.connected === true ||
          data.service?.includes('Deriv') ||
          data.terminal ||
          data.account)
      );

      if (isRealBridge) {
        setBridgeConfig((prev) => ({
          ...prev,
          isConnected: true,
          latencyMs: latency,
          lastPingTime: Date.now(),
          accountInfo: data.account || prev.accountInfo,
        }));

        if (data.account?.balance) {
          addLog(
            'SYSTEM',
            `[DERIV BRIDGE] Connected to Deriv MT5 #${data.account.login} (${data.account.server}) - Balance: $${Number(data.account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${latency}ms)`
          );
        } else {
          addLog('SYSTEM', `[DERIV BRIDGE] Connected to Deriv MT5 FastAPI microservice (${latency}ms)`);
        }
      } else {
        setBridgeConfig((prev) => ({ ...prev, isConnected: false, latencyMs: null }));
        addLog('SYSTEM', `[DERIV BRIDGE] Bridge reachable, but MT5 terminal is not attached: ${data?.error || 'Check MT5'}`);
      }
    } catch (err: any) {
      setBridgeConfig((prev) => ({ ...prev, isConnected: false, latencyMs: null }));
      addLog('SYSTEM', `[DERIV BRIDGE] Could not reach bridge at ${bridgeConfig.url}. Run 'python mcllc_deriv_bridge.py' locally.`);
    } finally {
      setIsTestingConnection(false);
    }
  }, [bridgeConfig.url, addLog]);

  // Initial silent ping to bridge on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/bridge/health?bridgeUrl=${encodeURIComponent(bridgeConfig.url)}`)
        .then((res) => res.json())
        .then((data) => {
          const isRealBridge = Boolean(
            data &&
            (data.connected === true ||
              data.service?.includes('Deriv') ||
              data.terminal ||
              data.account)
          );
          if (isRealBridge) {
            setBridgeConfig((prev) => ({
              ...prev,
              isConnected: true,
              latencyMs: data.latencyMs ?? 5,
              lastPingTime: Date.now(),
              accountInfo: data.account || prev.accountInfo,
            }));
            addLog('SYSTEM', `[DERIV BRIDGE AUTO-DETECT] Local Deriv MT5 FastAPI Bridge online (${data.latencyMs ?? 5}ms)`);
          }
        })
        .catch(() => {
          // Silent catch on init
        });
    }, 1500);
    return () => clearTimeout(timer);
  }, [bridgeConfig.url, addLog]);

  // Synchronize Live Open Positions & Account Equity from Deriv MT5
  useEffect(() => {
    if (!bridgeConfig.useLiveBridge || !bridgeConfig.isConnected) return;

    let isMounted = true;
    const syncLiveMt5 = async () => {
      try {
        // 1. Fetch live open positions from Deriv MT5
        const posRes = await fetch(`/api/bridge/positions?bridgeUrl=${encodeURIComponent(bridgeConfig.url)}`);
        if (posRes.ok && isMounted) {
          const posData = await posRes.json();
          if (Array.isArray(posData.positions)) {
            const livePositions: Mt5Position[] = posData.positions.map((p: any) => ({
              ticket: p.ticket,
              symbol: p.symbol,
              type: p.type as 'BUY' | 'SELL',
              volume: p.volume,
              price: p.open_price,
              currentPrice: p.current_price,
              sl: p.sl || 0,
              tp: p.tp || 0,
              profit: p.profit,
              profitPercent: p.open_price ? ((p.current_price - p.open_price) / p.open_price) * 100 : 0,
              magic: p.magic || botConfig.magicNumber,
              comment: p.comment || 'MT5 Deal',
              openTime: p.time ? p.time * 1000 : Date.now(),
              batchId: p.comment?.includes('Sub') ? p.comment : `TICKET-${p.ticket}`,
            }));
            setPositions(livePositions);
          }
        }

        // 2. Fetch live account equity & balance
        const accRes = await fetch(`/api/bridge/account?bridgeUrl=${encodeURIComponent(bridgeConfig.url)}`);
        if (accRes.ok && isMounted) {
          const accData = await accRes.json();
          if (accData.balance !== undefined) {
            setAccount((prev) => {
              const bal = Number(accData.balance);
              const eq = Number(accData.equity);
              const flProfit = Number((eq - bal).toFixed(2));
              const targetAmount = Number((bal * prev.targetProfitPercent).toFixed(2));
              const targetEq = Number((bal * (1 + prev.targetProfitPercent)).toFixed(2));

              return {
                ...prev,
                balance: bal,
                equity: eq,
                profit: flProfit,
                margin: Number(accData.margin || 0),
                freeMargin: Number(accData.free_margin || bal),
                marginLevel: Number(accData.margin_level || 0),
                peakEquity: Math.max(prev.peakEquity, eq),
                targetEquity: targetEq,
                targetProfitAmount: targetAmount,
              };
            });
          }
        }
      } catch (err) {
        // Silent background sync retry
      }
    };

    syncLiveMt5();
    const interval = setInterval(syncLiveMt5, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bridgeConfig.useLiveBridge, bridgeConfig.isConnected, bridgeConfig.url, botConfig.magicNumber]);

  // Dispatch 4x 0.05 lot Nano-trades for a symbol (Live Deriv MT5 or Simulation)
  const dispatchOrder = useCallback(
    async (symbol: string, orderType: 'BUY' | 'SELL', directTickets?: number[], directPrice?: number) => {
      const meta = SYMBOL_METAS.find((m) => m.symbol === symbol) || selectedMeta;
      const candles = candlesMap[symbol] || [];
      const latestClose = candles[candles.length - 1]?.close || meta.defaultPrice;
      const spread = meta.spreadPips / meta.pipMultiplier;
      let price = directPrice || (orderType === 'BUY' ? latestClose + spread / 2 : latestClose - spread / 2);

      let tickets: number[] = directTickets ? [...directTickets] : [];

      // If live bridge mode is active and tickets not yet supplied
      if (!directTickets && bridgeConfig.useLiveBridge && bridgeConfig.isConnected) {
        try {
          const res = await fetch('/api/bridge/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bridgeUrl: bridgeConfig.url,
              symbol,
              volume: botConfig.defaultLotSize,
              order_type: orderType,
              magic: botConfig.magicNumber,
              deviation: 20,
              comment: 'MCLLC Nano-Trade',
            }),
          });
          if (res.ok) {
            const bridgeData = await res.json();
            if (bridgeData.tickets && bridgeData.tickets.length > 0) {
              tickets = bridgeData.tickets;
              if (bridgeData.price) price = bridgeData.price;
              addLog(
                'EXECUTION',
                `[DERIV MT5 BRIDGE] 4x Nano-trades verified! Tickets: #${tickets.join(', #')} @ ${price.toFixed(meta.decimals)}`
              );
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            addLog(
              'ALERT',
              `[DERIV BRIDGE WARN] Live execution failed (${errData.error || 'Server error'}), executed in sandbox mode.`
            );
          }
        } catch (bridgeErr: any) {
          addLog(
            'ALERT',
            `[DERIV BRIDGE WARN] Connection error: ${bridgeErr.message}. Executed in sandbox mode.`
          );
        }
      }

      // If tickets still not assigned (sandbox fallback or offline)
      if (tickets.length === 0) {
        const baseTicket = Math.floor(10000000 + Math.random() * 89999999);
        for (let i = 0; i < botConfig.maxSubTrades; i++) {
          tickets.push(baseTicket + i);
        }
      }

      const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
      const newTrades: Mt5Position[] = tickets.map((t, i) => ({
        ticket: t,
        symbol,
        type: orderType,
        volume: botConfig.defaultLotSize,
        price,
        currentPrice: price,
        sl: 0,
        tp: 0,
        profit: 0,
        profitPercent: 0,
        magic: botConfig.magicNumber,
        comment: `MCLLC_Sub_${i + 1}`,
        openTime: Date.now(),
        batchId,
      }));

      setPositions((prev) => [...prev, ...newTrades]);
      soundEngine.playOrderExecution();
      if (!directTickets && (!bridgeConfig.useLiveBridge || !bridgeConfig.isConnected)) {
        addLog(
          'EXECUTION',
          `[MCLLC EXECUTION] Dispatched ${botConfig.maxSubTrades} nano-trades of ${botConfig.defaultLotSize} lots on ${symbol} @ ${price.toFixed(meta.decimals)}`
        );
      }

      persistTradeToCloudSql({
        symbol,
        orderType,
        volume: botConfig.defaultLotSize,
        subTradesCount: botConfig.maxSubTrades,
        openPrice: price,
        batchId,
        reason: bridgeConfig.useLiveBridge && bridgeConfig.isConnected ? 'Deriv MT5 Live Execution' : 'Algorithmic Confluence Signal',
      });
    },
    [botConfig, candlesMap, selectedMeta, addLog, persistTradeToCloudSql, bridgeConfig]
  );

  // Close All Positions (Batch Liquidation via Deriv MT5 Bridge + Local State)
  const closeAll = useCallback(
    async (reason = 'Manual Close All') => {
      if (positions.length === 0) return;

      // If live bridge is active, dispatch liquidation to MT5
      if (bridgeConfig.useLiveBridge && bridgeConfig.isConnected) {
        try {
          const res = await fetch('/api/bridge/close-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bridgeUrl: bridgeConfig.url,
              magic: botConfig.magicNumber,
              reason,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            addLog(
              'RISK',
              `[DERIV MT5 LIQUIDATION] Closed ${data.closed_count || positions.length} tickets on MT5 terminal.`
            );
          }
        } catch (e) {
          console.error('Failed to trigger bridge liquidation:', e);
        }
      }

      const totalProfitRealized = positions.reduce((acc, p) => acc + p.profit, 0);

      setAccount((prev) => {
        const newBalance = Number((prev.balance + totalProfitRealized).toFixed(2));
        const newPeak = Math.max(prev.peakEquity, newBalance);
        const newRealized = Number((prev.totalRealizedProfit + totalProfitRealized).toFixed(2));
        const updatedAcc = {
          ...prev,
          balance: newBalance,
          equity: newBalance,
          profit: 0.0,
          margin: 0.0,
          freeMargin: newBalance,
          marginLevel: 0.0,
          peakEquity: newPeak,
          totalRealizedProfit: newRealized,
          targetEquity: Number((newBalance * (1 + prev.targetProfitPercent)).toFixed(2)),
          targetProfitAmount: Number((newBalance * prev.targetProfitPercent).toFixed(2)),
        };

        persistAccountToCloudSql({
          balance: newBalance,
          equity: newBalance,
          liquidationsCount: prev.liquidationsCount,
          riskLiquidationsCount: prev.riskBalanceLiquidationsCount,
          totalRealizedProfit: newRealized,
        });

        return updatedAcc;
      });

      setPositions([]);
      addLog(
        'SYSTEM',
        `[MCLLC CLOSE] Liquidated all ${positions.length} open tickets (${reason}). Realized: ${totalProfitRealized >= 0 ? '+' : ''}$${totalProfitRealized.toFixed(2)}`
      );
    },
    [positions, addLog, persistAccountToCloudSql, bridgeConfig, botConfig.magicNumber]
  );

  // Manual Test Nano-Trade Dispatcher for the Bridge Modal
  const handleExecuteTestTrade = useCallback(
    async (symbol: string, orderType: 'BUY' | 'SELL') => {
      if (bridgeConfig.isConnected) {
        const res = await fetch('/api/bridge/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bridgeUrl: bridgeConfig.url,
            symbol,
            volume: botConfig.defaultLotSize,
            order_type: orderType,
            magic: botConfig.magicNumber,
            deviation: 20,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) || 'Deriv MT5 execution failed');
        }
        await dispatchOrder(symbol, orderType, data.tickets, data.price);
      } else {
        await dispatchOrder(symbol, orderType);
      }
    },
    [bridgeConfig.isConnected, bridgeConfig.url, botConfig.defaultLotSize, botConfig.magicNumber, dispatchOrder]
  );

  // Close Single Position
  const closePosition = useCallback(
    async (ticket: number) => {
      const pos = positions.find((p) => p.ticket === ticket);
      if (!pos) return;

      // If live bridge active, close deal on MT5
      if (bridgeConfig.useLiveBridge && bridgeConfig.isConnected) {
        try {
          const res = await fetch('/api/bridge/close-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bridgeUrl: bridgeConfig.url,
              ticket,
              comment: 'Terminal Manual Close',
            }),
          });
          if (res.ok) {
            addLog('INFO', `[DERIV MT5] Position #${ticket} closed successfully on broker terminal.`);
          }
        } catch (e) {
          console.error('Failed to close position via bridge:', e);
        }
      }

      setAccount((prev) => {
        const newBalance = Number((prev.balance + pos.profit).toFixed(2));
        const newRealized = Number((prev.totalRealizedProfit + pos.profit).toFixed(2));
        persistAccountToCloudSql({
          balance: newBalance,
          equity: Number((prev.equity + pos.profit).toFixed(2)),
          liquidationsCount: prev.liquidationsCount,
          riskLiquidationsCount: prev.riskBalanceLiquidationsCount,
          totalRealizedProfit: newRealized,
        });
        return {
          ...prev,
          balance: newBalance,
          equity: Number((prev.equity + pos.profit).toFixed(2)),
          profit: Number((prev.profit - pos.profit).toFixed(2)),
          totalRealizedProfit: newRealized,
        };
      });

      setPositions((prev) => prev.filter((p) => p.ticket !== ticket));
      addLog('INFO', `Closed ticket #${pos.ticket} (${pos.symbol} ${pos.type} ${pos.volume}) with ${pos.profit >= 0 ? '+' : ''}$${pos.profit.toFixed(2)}`);
    },
    [positions, addLog, persistAccountToCloudSql, bridgeConfig]
  );

  // Close Batch of 4 Sub-Trades
  const closeBatch = useCallback(
    (batchId: string) => {
      const batchTrades = positions.filter((p) => p.batchId === batchId);
      if (batchTrades.length === 0) return;

      const batchProfit = batchTrades.reduce((acc, p) => acc + p.profit, 0);
      setAccount((prev) => {
        const newBalance = Number((prev.balance + batchProfit).toFixed(2));
        const newRealized = Number((prev.totalRealizedProfit + batchProfit).toFixed(2));
        persistAccountToCloudSql({
          balance: newBalance,
          equity: Number((prev.equity + batchProfit).toFixed(2)),
          liquidationsCount: prev.liquidationsCount,
          riskLiquidationsCount: prev.riskBalanceLiquidationsCount,
          totalRealizedProfit: newRealized,
        });
        return {
          ...prev,
          balance: newBalance,
          equity: Number((prev.equity + batchProfit).toFixed(2)),
          profit: Number((prev.profit - batchProfit).toFixed(2)),
          totalRealizedProfit: newRealized,
        };
      });

      setPositions((prev) => prev.filter((p) => p.batchId !== batchId));
      addLog('INFO', `Closed sub-trade batch ${batchId} (${batchTrades.length} tickets). Net: ${batchProfit >= 0 ? '+' : ''}$${batchProfit.toFixed(2)}`);
    },
    [positions, addLog, persistAccountToCloudSql]
  );

  // Check Asian Session Alert (00:00 UTC Open)
  const checkAsianSessionAlert = useCallback(() => {
    const nowUtc = new Date();
    const isHourZero = nowUtc.getUTCHours() === 0;

    if (isHourZero && !asianAlertDismissed && !asianAlertTriggered) {
      setAsianAlertTriggered(true);
      soundEngine.playAsianSessionAlert();
      addLog('ALERT', `[MCLLC ALERT] Asian Session Opened at ${nowUtc.toISOString().replace('T', ' ').substring(0, 19)} UTC`);
    }
  }, [asianAlertDismissed, asianAlertTriggered, addLog]);

  // Main 30-Second Sub-Candle Evaluation Loop
  const evaluateLoop = useCallback(() => {
    // 1. Check Asian Session Open
    checkAsianSessionAlert();

    // 2. Monitor and Manage: 10% Profit Target Rule
    const currentProfit = account.equity - account.balance;
    const targetProfitAmount = account.balance * botConfig.targetProfitPercent;

    if (currentProfit >= targetProfitAmount && positions.length > 0) {
      soundEngine.playTargetHit();
      addLog(
        'TARGET',
        `[MCLLC TARGET] 10% Profit Target Hit (+${currentProfit.toFixed(2)}). Liquidating all open positions.`
      );
      setAccount((prev) => ({
        ...prev,
        liquidationsCount: prev.liquidationsCount + 1,
      }));
      closeAll('10% Target Hit Auto-Liquidation');
      return;
    }

    // 3. Monitor and Manage: MCLLC Risk Balancer Rule
    const losing = positions.filter((p) => p.profit < 0);
    const profitable = positions.filter((p) => p.profit > 0);
    const netSum = positions.reduce((acc, p) => acc + p.profit, 0);

    if (losing.length >= 1 && profitable.length >= 2 && netSum > 0) {
      soundEngine.playRiskBalancerLiquidation();
      addLog(
        'RISK',
        `[MCLLC RISK RULE] 1 loss balanced by >=2 profits with net positive equity (+$${netSum.toFixed(2)}). Liquidating batch.`
      );
      setAccount((prev) => ({
        ...prev,
        riskBalanceLiquidationsCount: prev.riskBalanceLiquidationsCount + 1,
      }));
      closeAll('Risk Balancer Equilibrium Reached');
      return;
    }

    // 4. Scan all symbols for Institutional ICT setups
    setCandlesMap((prevMap) => {
      const nextMap = { ...prevMap };

      for (const symbol of SYMBOLS) {
        const meta = SYMBOL_METAS.find((m) => m.symbol === symbol)!;
        const currentCandles = prevMap[symbol] || [];

        const { updatedCandles, newClose } = advanceSymbolCandle(meta, currentCandles, true);
        nextMap[symbol] = updatedCandles;

        const ind = calculateIndicators(updatedCandles);
        const structures = detectInstitutionalStructures(updatedCandles, ind.latest);

        const hasOpenPos = positions.some((p) => p.symbol === symbol);

        if (!hasOpenPos && botConfig.autoExecute) {
          const { shouldBuy, shouldSell, reasons } = evaluateSignals(
            symbol,
            newClose,
            ind.latest,
            structures
          );

          if (shouldBuy) {
            dispatchOrder(symbol, 'BUY');
            addLog('EXECUTION', `[CONFLUENCE] BUY setup on ${symbol}: ${reasons.join(' | ')}`);
          } else if (shouldSell) {
            dispatchOrder(symbol, 'SELL');
            addLog('EXECUTION', `[CONFLUENCE] SELL setup on ${symbol}: ${reasons.join(' | ')}`);
          }
        }
      }

      return nextMap;
    });

    setCountdown(botConfig.pollIntervalSec);
  }, [
    checkAsianSessionAlert,
    account.equity,
    account.balance,
    botConfig,
    positions,
    closeAll,
    dispatchOrder,
    addLog,
  ]);

  // Live Tick Timer
  useEffect(() => {
    if (!botConfig.isRunning) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const step = 1 * botConfig.playbackSpeed;
        if (prev <= step) {
          evaluateLoop();
          return botConfig.pollIntervalSec;
        }
        return prev - step;
      });

      setCandlesMap((prevMap) => {
        const nextMap = { ...prevMap };
        const randomSymbols = [
          selectedSymbol,
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        ];

        randomSymbols.forEach((sym) => {
          const meta = SYMBOL_METAS.find((m) => m.symbol === sym);
          if (meta && nextMap[sym]) {
            const { updatedCandles } = advanceSymbolCandle(meta, nextMap[sym], false);
            nextMap[sym] = updatedCandles;
          }
        });

        setPositions((prevPositions) => {
          if (prevPositions.length === 0) return prevPositions;

          let updatedAny = false;
          let totalFloating = 0;
          let totalMargin = 0;

          const updated = prevPositions.map((pos) => {
            const symCandles = nextMap[pos.symbol] || [];
            const lastCandle = symCandles[symCandles.length - 1];
            if (!lastCandle) return pos;

            const { profitUsd } = calculatePositionProfit(
              pos.symbol,
              pos.type,
              pos.volume,
              pos.price,
              lastCandle.close
            );

            totalFloating += profitUsd;
            totalMargin += pos.volume * 100;

            if (pos.profit !== profitUsd || pos.currentPrice !== lastCandle.close) {
              updatedAny = true;
              return {
                ...pos,
                currentPrice: lastCandle.close,
                profit: profitUsd,
              };
            }
            return pos;
          });

          setAccount((prevAcc) => {
            const newEquity = Number((prevAcc.balance + totalFloating).toFixed(2));
            const newProfit = Number(totalFloating.toFixed(2));
            const freeMargin = Math.max(0, newEquity - totalMargin);
            const marginLevel = totalMargin > 0 ? (newEquity / totalMargin) * 100 : 0;
            const peak = Math.max(prevAcc.peakEquity, newEquity);

            return {
              ...prevAcc,
              equity: newEquity,
              profit: newProfit,
              margin: totalMargin,
              freeMargin,
              marginLevel,
              peakEquity: peak,
            };
          });

          return updatedAny ? updated : prevPositions;
        });

        return nextMap;
      });
    }, 1000 / botConfig.playbackSpeed);

    return () => clearInterval(interval);
  }, [botConfig.isRunning, botConfig.playbackSpeed, botConfig.pollIntervalSec, evaluateLoop, selectedSymbol]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 3-Zone Header Contract */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        isRunning={botConfig.isRunning}
        onToggleRun={() => {
          const next = !botConfig.isRunning;
          setBotConfig((c) => ({ ...c, isRunning: next }));
          addLog('SYSTEM', next ? '[SYSTEM] Resumed 30s evaluation loop.' : '[SYSTEM] Paused bot engine.');
        }}
        countdown={countdown}
        asianSessionActive={asianSessionActive}
        asianAlertTriggered={asianAlertTriggered}
        onDismissAsianAlert={() => setAsianAlertDismissed(true)}
        soundEnabled={botConfig.soundAlerts}
        onToggleSound={() => {
          const next = !botConfig.soundAlerts;
          setBotConfig((c) => ({ ...c, soundAlerts: next }));
          soundEngine.setEnabled(next);
        }}
        speed={botConfig.playbackSpeed}
        onChangeSpeed={(spd) => setBotConfig((c) => ({ ...c, playbackSpeed: spd }))}
        onOpenScriptModal={() => setIsScriptModalOpen(true)}
      />

      {/* Secondary Workspace Toolbar */}
      <WorkspaceToolbar
        countdown={countdown}
        pollInterval={botConfig.pollIntervalSec}
        speed={botConfig.playbackSpeed}
        onChangeSpeed={(spd) => setBotConfig((c) => ({ ...c, playbackSpeed: spd }))}
        onForceEvaluation={evaluateLoop}
        soundEnabled={botConfig.soundAlerts}
        onToggleSound={() => {
          const next = !botConfig.soundAlerts;
          setBotConfig((c) => ({ ...c, soundAlerts: next }));
          soundEngine.setEnabled(next);
        }}
        asianSessionActive={asianSessionActive}
        asianAlertTriggered={asianAlertTriggered && !asianAlertDismissed}
        onDismissAsianAlert={() => setAsianAlertDismissed(true)}
        utcTime={utcTime}
        bridgeConnected={bridgeConfig.isConnected}
        bridgeLatency={bridgeConfig.latencyMs}
        useLiveBridge={bridgeConfig.useLiveBridge}
        onOpenBridgeModal={() => setIsScriptModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-4">
        {/* Top KPI Banners */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TargetProgressBanner
              account={account}
              onLiquidateAll={() => closeAll('Target Banner Close All')}
              openPositionsCount={positions.length}
            />
          </div>
          <div>
            <RiskBalancerWidget
              balancerState={balancerState}
              totalPositions={positions.length}
              riskLiquidationsCount={account.riskBalanceLiquidationsCount}
            />
          </div>
        </div>

        {/* Dynamic Views */}
        {activeView === 'webterminal' ? (
          <Mt5WebTerminal
            candlesMap={candlesMap}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            positions={positions}
            account={account}
            onClosePosition={closePosition}
            onCloseAll={closeAll}
            onDispatchOrder={dispatchOrder}
            bridgeConfig={bridgeConfig}
            onOpenBridgeModal={() => setIsScriptModalOpen(true)}
            logs={logs}
            structures={selectedAnalysis.structures}
          />
        ) : activeView === 'chat' ? (
          /* Gemini Multi-turn Chat View */
          <div className="h-[650px]">
            <GeminiChatbot isOpen={true} onClose={() => setActiveView('dashboard')} />
          </div>
        ) : activeView === 'radar' ? (
          <div className="space-y-4">
            <SymbolRadar
              symbolsData={symbolsData}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={(sym) => {
                setSelectedSymbol(sym);
                setActiveView('dashboard');
              }}
              onDispatchOrder={(sym, type) => dispatchOrder(sym, type)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ActivePositionsTable
                positions={positions}
                onClosePosition={closePosition}
                onCloseBatch={closeBatch}
                onLiquidateAll={() => closeAll('Manual Liquidate All')}
              />
              <ExecutionConsole logs={logs} onClearLogs={() => setLogs([])} />
            </div>
          </div>
        ) : activeView === 'balancer' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <RiskBalancerWidget
                  balancerState={balancerState}
                  totalPositions={positions.length}
                  riskLiquidationsCount={account.riskBalanceLiquidationsCount}
                />
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-xs space-y-3">
                  <h3 className="font-semibold text-neutral-100 text-sm">How MCLLC Risk Balancing Operates</h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Rather than relying solely on individual stop-losses that can be hunted by market volatility, the MCLLC engine dynamically calculates batch equilibrium across all nano-trades.
                  </p>
                  <div className="space-y-2 font-mono text-[11px] bg-neutral-950 p-3 rounded border border-neutral-800">
                    <div className="text-amber-400"># Python Rule Definition:</div>
                    <div className="text-neutral-300">if len(losing) &gt;= 1 and len(profitable) &gt;= 2:</div>
                    <div className="text-neutral-300 ml-4">if sum(p.profit for p in positions) &gt; 0:</div>
                    <div className="text-emerald-400 ml-8">close_all()  # Liquidate batch</div>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    This guarantees that a losing position is only closed when counterbalanced by at least two profitable positions yielding a net positive cash return.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-2">
                <ActivePositionsTable
                  positions={positions}
                  onClosePosition={closePosition}
                  onCloseBatch={closeBatch}
                  onLiquidateAll={() => closeAll('Manual Liquidate All')}
                />
              </div>
            </div>
            <ExecutionConsole logs={logs} onClearLogs={() => setLogs([])} />
          </div>
        ) : (
          /* Dashboard View: Chart + Positions + Execution Console + Symbol Strip */
          <div className="space-y-4">
            {/* Quick 10-Symbol Horizontal Ticker Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
              {symbolsData.map((item) => (
                <button
                  key={item.meta.symbol}
                  onClick={() => setSelectedSymbol(item.meta.symbol)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border whitespace-nowrap transition-all ${
                    item.meta.symbol === selectedSymbol
                      ? 'bg-neutral-800 border-sky-500 text-neutral-100 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="font-semibold">{item.meta.symbol}</span>
                  <span className="text-neutral-200">{item.price.toFixed(item.meta.decimals)}</span>
                  {item.structures.bullish_fvg && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Bullish FVG" />
                  )}
                  {item.structures.bearish_fvg && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Bearish FVG" />
                  )}
                  {item.structures.mss_bullish && (
                    <span className="text-[10px] text-emerald-400 font-bold">MSS▲</span>
                  )}
                  {item.structures.mss_bearish && (
                    <span className="text-[10px] text-rose-400 font-bold">MSS▼</span>
                  )}
                </button>
              ))}
            </div>

            {/* Interactive Candlestick Chart */}
            <div className="h-[480px]">
              <InteractiveChart
                symbolMeta={selectedMeta}
                candles={selectedCandles}
                indicators={selectedAnalysis.latest}
                structures={selectedAnalysis.structures}
                rsiValues={selectedAnalysis.rsiValues}
                stochKValues={selectedAnalysis.stochKValues}
                stochDValues={selectedAnalysis.stochDValues}
                ema20Values={selectedAnalysis.ema20Values}
                ema50Values={selectedAnalysis.ema50Values}
                positions={positions}
                onManualOrder={(type) => dispatchOrder(selectedSymbol, type)}
              />
            </div>

            {/* Bottom 2 Columns: Open Positions & Execution Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <ActivePositionsTable
                  positions={positions}
                  onClosePosition={closePosition}
                  onCloseBatch={closeBatch}
                  onLiquidateAll={() => closeAll('Manual Liquidate All')}
                />
              </div>
              <div className="lg:col-span-5">
                <ExecutionConsole logs={logs} onClearLogs={() => setLogs([])} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Script & MT5 Bridge Modal */}
      <Mt5BridgeModal
        isOpen={isScriptModalOpen}
        onClose={() => {
          setIsScriptModalOpen(false);
          if (activeView === 'script') setActiveView('dashboard');
        }}
        bridgeConfig={bridgeConfig}
        setBridgeConfig={setBridgeConfig}
        onTestConnection={testBridgeConnection}
        onExecuteTestTrade={handleExecuteTestTrade}
        isTestingConnection={isTestingConnection}
      />
    </div>
  );
}
