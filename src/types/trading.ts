export type MarketCategory = 'Forex' | 'Metals' | 'Indices' | 'Synthetics';

export interface SymbolMeta {
  symbol: string;
  name: string;
  category: MarketCategory;
  decimals: number;
  pipMultiplier: number;
  defaultPrice: number;
  spreadPips: number;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  stochK: number;
  stochD: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
}

export interface FvgZone {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  c1Index: number;
  c3Index: number;
  inverted?: boolean;
}

export interface FibRetracement {
  high: number;
  low: number;
  fib500: number;
  fib618: number;
  fib705: number;
  fib786: number;
}

export interface InstitutionalStructures {
  bullish_fvg: boolean;
  bearish_fvg: boolean;
  ifvg_bullish: boolean;
  ifvg_bearish: boolean;
  vimb: boolean;
  mss_bullish: boolean;
  mss_bearish: boolean;
  oversold: boolean;
  overbought: boolean;
  activeFvgZone?: FvgZone;
  swingHigh?: number;
  swingLow?: number;
  fib?: FibRetracement;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  timestamp: number;
  price: number;
  indicators: TechnicalIndicators;
  structures: InstitutionalStructures;
  reason: string;
}

export interface Mt5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number; // 0.05
  price: number; // open price
  currentPrice: number;
  sl: number;
  tp: number;
  profit: number;
  profitPercent: number;
  magic: number; // 998877
  comment: string; // MCLLC_Sub_1, MCLLC_Sub_2...
  openTime: number;
  batchId: string;
}

export interface AccountState {
  balance: number;
  equity: number;
  initialBalance: number;
  targetProfitPercent: number; // 0.10
  targetEquity: number;
  targetProfitAmount: number;
  profit: number; // equity - balance
  margin: number;
  freeMargin: number;
  marginLevel: number;
  peakEquity: number;
  totalRealizedProfit: number;
  liquidationsCount: number;
  riskBalanceLiquidationsCount: number;
}

export interface RiskBalancerState {
  losingCount: number;
  profitableCount: number;
  netProfit: number;
  isRuleSatisfied: boolean; // >=1 loss, >=2 profit, sum > 0
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'SYSTEM' | 'EXECUTION' | 'RISK' | 'TARGET' | 'ALERT' | 'INFO';
  message: string;
}

export interface BotConfig {
  isRunning: boolean;
  pollIntervalSec: number; // 30
  defaultLotSize: number; // 0.05
  maxSubTrades: number; // 4
  targetProfitPercent: number; // 0.10
  magicNumber: number; // 998877
  autoExecute: boolean;
  soundAlerts: boolean;
  playbackSpeed: number; // 1, 2, 5, 10
}

export interface BridgeAccountInfo {
  login: number | null;
  server: string | null;
  company: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  free_margin: number;
  currency: string;
}

export interface BridgeConfig {
  url: string; // e.g. "http://localhost:8000"
  loginId: number;
  password: string;
  server: string;
  port: number;
  useLiveBridge: boolean;
  isConnected: boolean;
  latencyMs: number | null;
  lastPingTime: number | null;
  accountInfo?: BridgeAccountInfo | null;
}

