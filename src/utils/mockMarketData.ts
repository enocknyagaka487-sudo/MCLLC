import { Candle, SymbolMeta } from '../types/trading';
import { SYMBOL_METAS } from './constants';

/**
 * Generates realistic historical M1 candles for a given symbol
 */
export function generateInitialCandles(meta: SymbolMeta, count = 60): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = 60; // 1 minute candle
  let currentPrice = meta.defaultPrice;
  const volatility = currentPrice * 0.0008; // 0.08% candle volatility

  const startTime = now - count * interval;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * interval;
    // Introduce institutional momentum shifts every 8-12 candles to create natural FVGs and MSS
    const cycle = Math.sin(i / 5);
    const momentum = cycle * volatility * 1.5;
    const randomNoise = (Math.random() - 0.49) * volatility;
    const delta = momentum + randomNoise;

    const open = currentPrice;
    const close = Number((open + delta).toFixed(meta.decimals));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.6).toFixed(meta.decimals));
    const low = Number((Math.min(open, close) - Math.random() * volatility * 0.6).toFixed(meta.decimals));
    const volume = Math.floor(100 + Math.random() * 400 + Math.abs(delta) * 500);

    candles.push({ time, open, high, low, close, volume });
    currentPrice = close;
  }

  return candles;
}

/**
 * Generates initial market state map for all 10 symbols
 */
export function initializeMarketState(): Record<string, Candle[]> {
  const state: Record<string, Candle[]> = {};
  for (const meta of SYMBOL_METAS) {
    state[meta.symbol] = generateInitialCandles(meta, 50);
  }
  return state;
}

/**
 * Simulates next tick / sub-candle update on a symbol
 */
export function advanceSymbolCandle(
  meta: SymbolMeta,
  candles: Candle[],
  isNewCandle: boolean
): { updatedCandles: Candle[]; newClose: number; bid: number; ask: number } {
  const list = [...candles];
  const last = list[list.length - 1];
  const volatility = last.close * 0.0003;
  const tickChange = (Math.random() - 0.495) * volatility;
  const spread = meta.spreadPips / meta.pipMultiplier;

  if (isNewCandle) {
    const time = last.time + 60;
    const open = last.close;
    const close = Number((open + tickChange).toFixed(meta.decimals));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.4).toFixed(meta.decimals));
    const low = Number((Math.min(open, close) - Math.random() * volatility * 0.4).toFixed(meta.decimals));
    const volume = Math.floor(120 + Math.random() * 150);

    list.push({ time, open, high, low, close, volume });
    if (list.length > 80) list.shift();

    const ask = Number((close + spread / 2).toFixed(meta.decimals));
    const bid = Number((close - spread / 2).toFixed(meta.decimals));
    return { updatedCandles: list, newClose: close, bid, ask };
  } else {
    // Modify current candle wicks and close
    const newClose = Number((last.close + tickChange).toFixed(meta.decimals));
    const newHigh = Number(Math.max(last.high, newClose).toFixed(meta.decimals));
    const newLow = Number(Math.min(last.low, newClose).toFixed(meta.decimals));
    const updatedLast: Candle = {
      ...last,
      close: newClose,
      high: newHigh,
      low: newLow,
      volume: last.volume + 1,
    };
    list[list.length - 1] = updatedLast;

    const ask = Number((newClose + spread / 2).toFixed(meta.decimals));
    const bid = Number((newClose - spread / 2).toFixed(meta.decimals));
    return { updatedCandles: list, newClose, bid, ask };
  }
}

/**
 * Calculates profit in USD for an MT5 position given current price
 */
export function calculatePositionProfit(
  symbol: string,
  type: 'BUY' | 'SELL',
  volume: number,
  openPrice: number,
  currentPrice: number
): { profitUsd: number; profitPips: number } {
  const meta = SYMBOL_METAS.find((m) => m.symbol === symbol);
  if (!meta) return { profitUsd: 0, profitPips: 0 };

  const priceDiff = type === 'BUY' ? currentPrice - openPrice : openPrice - currentPrice;
  const profitPips = priceDiff * meta.pipMultiplier;

  let profitUsd = 0;
  if (symbol === 'XAUUSD') {
    // 1 lot = 100 oz. 0.05 lot = 5 oz. $1 move = $5.00
    profitUsd = priceDiff * (volume * 100);
  } else if (symbol === 'US30') {
    profitUsd = priceDiff * (volume * 10);
  } else if (symbol === 'DXY') {
    profitUsd = priceDiff * (volume * 50);
  } else if (symbol.includes('Index')) {
    profitUsd = priceDiff * (volume * 20);
  } else {
    // Standard Forex: 0.05 lot is ~ $0.50 per pip on USD counter currency
    profitUsd = profitPips * (volume * 10);
  }

  return {
    profitUsd: Number(profitUsd.toFixed(2)),
    profitPips: Number(profitPips.toFixed(1)),
  };
}
