import { SymbolMeta } from '../types/trading';

export const MAGIC_NUMBER = 998877;
export const DEFAULT_LOT_SIZE = 0.05;
export const MAX_SUB_TRADES = 4;
export const TARGET_PROFIT_PERCENT = 0.10; // 10% target
export const POLL_INTERVAL_SEC = 30.0; // 30-sec loop

export const SYMBOL_METAS: SymbolMeta[] = [
  {
    symbol: 'XAUUSD',
    name: 'Gold vs US Dollar',
    category: 'Metals',
    decimals: 2,
    pipMultiplier: 10,
    defaultPrice: 2684.50,
    spreadPips: 2.5,
  },
  {
    symbol: 'USDCAD',
    name: 'US Dollar vs Canadian Dollar',
    category: 'Forex',
    decimals: 5,
    pipMultiplier: 10000,
    defaultPrice: 1.38920,
    spreadPips: 1.2,
  },
  {
    symbol: 'AUDUSD',
    name: 'Australian Dollar vs US Dollar',
    category: 'Forex',
    decimals: 5,
    pipMultiplier: 10000,
    defaultPrice: 0.65480,
    spreadPips: 1.1,
  },
  {
    symbol: 'US30',
    name: 'Dow Jones Industrial Average 30',
    category: 'Indices',
    decimals: 1,
    pipMultiplier: 1,
    defaultPrice: 43920.0,
    spreadPips: 3.0,
  },
  {
    symbol: 'DXY',
    name: 'US Dollar Index',
    category: 'Indices',
    decimals: 2,
    pipMultiplier: 100,
    defaultPrice: 104.85,
    spreadPips: 1.5,
  },
  {
    symbol: 'GBPUSD',
    name: 'British Pound vs US Dollar',
    category: 'Forex',
    decimals: 5,
    pipMultiplier: 10000,
    defaultPrice: 1.29650,
    spreadPips: 1.3,
  },
  {
    symbol: 'GBPJPY',
    name: 'British Pound vs Japanese Yen',
    category: 'Forex',
    decimals: 3,
    pipMultiplier: 100,
    defaultPrice: 198.420,
    spreadPips: 2.1,
  },
  {
    symbol: 'Volatility 100 Index',
    name: 'Volatility 100 (1s) Synthetic Index',
    category: 'Synthetics',
    decimals: 2,
    pipMultiplier: 100,
    defaultPrice: 2480.35,
    spreadPips: 5.0,
  },
  {
    symbol: 'Crash 500 Index',
    name: 'Crash 500 Synthetic Index',
    category: 'Synthetics',
    decimals: 2,
    pipMultiplier: 100,
    defaultPrice: 3820.75,
    spreadPips: 4.5,
  },
  {
    symbol: 'Boom 1000 Index',
    name: 'Boom 1000 Synthetic Index',
    category: 'Synthetics',
    decimals: 2,
    pipMultiplier: 100,
    defaultPrice: 8945.20,
    spreadPips: 4.8,
  },
];

export const SYMBOLS = SYMBOL_METAS.map((m) => m.symbol);
