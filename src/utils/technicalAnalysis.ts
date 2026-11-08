import { Candle, TechnicalIndicators, InstitutionalStructures, FvgZone, FibRetracement } from '../types/trading';

/**
 * Calculates RSI, Stochastic %K & %D, and EMAs matching the Python pandas/ewm logic
 */
export function calculateIndicators(
  candles: Candle[],
  rsiPeriod = 14,
  stochK = 14,
  stochD = 3
): {
  rsiValues: number[];
  stochKValues: number[];
  stochDValues: number[];
  ema20Values: number[];
  ema50Values: number[];
  latest: TechnicalIndicators;
} {
  const n = candles.length;
  if (n === 0) {
    return {
      rsiValues: [],
      stochKValues: [],
      stochDValues: [],
      ema20Values: [],
      ema50Values: [],
      latest: { rsi: 50, stochK: 50, stochD: 50 },
    };
  }

  // 1. Calculate RSI with exponential moving average (alpha = 1 / rsiPeriod)
  const rsiValues: number[] = new Array(n).fill(50);
  const gains: number[] = [0];
  const losses: number[] = [0];

  for (let i = 1; i < n; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  const alpha = 1 / rsiPeriod;
  let avgGain = gains.slice(0, Math.min(rsiPeriod, n)).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(rsiPeriod, n));
  let avgLoss = losses.slice(0, Math.min(rsiPeriod, n)).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(rsiPeriod, n));

  for (let i = 0; i < n; i++) {
    if (i < rsiPeriod) {
      const rs = avgGain / (avgLoss + 1e-10);
      rsiValues[i] = 100 - 100 / (1 + rs);
    } else {
      avgGain = alpha * gains[i] + (1 - alpha) * avgGain;
      avgLoss = alpha * losses[i] + (1 - alpha) * avgLoss;
      const rs = avgGain / (avgLoss + 1e-10);
      rsiValues[i] = 100 - 100 / (1 + rs);
    }
  }

  // 2. Stochastic Oscillator %K and %D
  const stochKValues: number[] = new Array(n).fill(50);
  const stochDValues: number[] = new Array(n).fill(50);

  for (let i = 0; i < n; i++) {
    const startIdx = Math.max(0, i - stochK + 1);
    const windowCandles = candles.slice(startIdx, i + 1);
    let lowestLow = Infinity;
    let highestHigh = -Infinity;

    for (const c of windowCandles) {
      if (c.low < lowestLow) lowestLow = c.low;
      if (c.high > highestHigh) highestHigh = c.high;
    }

    const currentClose = candles[i].close;
    const range = highestHigh - lowestLow;
    stochKValues[i] = range === 0 ? 50 : 100 * ((currentClose - lowestLow) / (range + 1e-10));

    // Stoch %D is rolling mean of %K over stochD
    const dStart = Math.max(0, i - stochD + 1);
    const dSlice = stochKValues.slice(dStart, i + 1);
    const dSum = dSlice.reduce((a, b) => a + b, 0);
    stochDValues[i] = dSum / dSlice.length;
  }

  // 3. Exponential Moving Averages (EMA 20 & EMA 50)
  const calcEma = (period: number): number[] => {
    const ema: number[] = new Array(n).fill(candles[0].close);
    const k = 2 / (period + 1);
    for (let i = 1; i < n; i++) {
      ema[i] = candles[i].close * k + ema[i - 1] * (1 - k);
    }
    return ema;
  };

  const ema20Values = calcEma(20);
  const ema50Values = calcEma(50);

  const lastIdx = n - 1;
  const latest: TechnicalIndicators = {
    rsi: Number(rsiValues[lastIdx].toFixed(2)),
    stochK: Number(stochKValues[lastIdx].toFixed(2)),
    stochD: Number(stochDValues[lastIdx].toFixed(2)),
    ema20: Number(ema20Values[lastIdx].toFixed(4)),
    ema50: Number(ema50Values[lastIdx].toFixed(4)),
  };

  return {
    rsiValues,
    stochKValues,
    stochDValues,
    ema20Values,
    ema50Values,
    latest,
  };
}

/**
 * Detects Fair Value Gaps (FVG), Inverted FVG (iFVG), Volume Imbalance (VIMB),
 * Market Structure Shift (MSS), and Fibonacci Retracement zones.
 */
export function detectInstitutionalStructures(
  candles: Candle[],
  latestIndicators: TechnicalIndicators
): InstitutionalStructures {
  const result: InstitutionalStructures = {
    bullish_fvg: false,
    bearish_fvg: false,
    ifvg_bullish: false,
    ifvg_bearish: false,
    vimb: false,
    mss_bullish: false,
    mss_bearish: false,
    oversold: false,
    overbought: false,
  };

  const n = candles.length;
  if (n < 4) return result;

  // c1: 4 bars ago, c2: 3 bars ago, c3: 2 bars ago, latest: most recent bar
  const c1 = candles[n - 4];
  const c2 = candles[n - 3];
  const c3 = candles[n - 2];
  const latest = candles[n - 1];

  // 1. Fair Value Gap (FVG)
  // Bullish FVG: c3 low > c1 high (imbalance candle c2 pushed aggressively up)
  if (c3.low > c1.high) {
    result.bullish_fvg = true;
    result.activeFvgZone = {
      type: 'bullish',
      top: c3.low,
      bottom: c1.high,
      c1Index: n - 4,
      c3Index: n - 2,
    };
  } else if (c3.high < c1.low) {
    // Bearish FVG: c3 high < c1 low
    result.bearish_fvg = true;
    result.activeFvgZone = {
      type: 'bearish',
      top: c1.low,
      bottom: c3.high,
      c1Index: n - 4,
      c3Index: n - 2,
    };
  }

  // 2. Inverted Fair Value Gap (iFVG)
  if (result.bearish_fvg && latest.close > c1.low) {
    result.ifvg_bullish = true;
    if (result.activeFvgZone) result.activeFvgZone.inverted = true;
  } else if (result.bullish_fvg && latest.close < c1.high) {
    result.ifvg_bearish = true;
    if (result.activeFvgZone) result.activeFvgZone.inverted = true;
  }

  // 3. Volume Imbalance (VIMB)
  // Gaps where candle open doesn't match previous close, yet wicks overlap
  if (
    (c3.open > c2.close && c3.low <= c2.high) ||
    (c3.open < c2.close && c3.high >= c2.low)
  ) {
    result.vimb = true;
  }

  // 4. Market Structure Shift (MSS)
  // Evaluates previous 10-period swing high / swing low (iloc[-10:-2])
  const lookbackStart = Math.max(0, n - 10);
  const lookbackEnd = Math.max(0, n - 2);
  const swingCandles = candles.slice(lookbackStart, lookbackEnd);

  if (swingCandles.length > 0) {
    let prevHigh = -Infinity;
    let prevLow = Infinity;
    for (const c of swingCandles) {
      if (c.high > prevHigh) prevHigh = c.high;
      if (c.low < prevLow) prevLow = c.low;
    }
    result.swingHigh = prevHigh;
    result.swingLow = prevLow;

    if (latest.close > prevHigh) {
      result.mss_bullish = true;
    } else if (latest.close < prevLow) {
      result.mss_bearish = true;
    }
  }

  // 5. Oversold & Overbought thresholds (RSI < 30 and Stoch_K < 20 / RSI > 70 and Stoch_K > 80)
  if (latestIndicators.rsi < 30 && latestIndicators.stochK < 20) {
    result.oversold = true;
  } else if (latestIndicators.rsi > 70 && latestIndicators.stochK > 80) {
    result.overbought = true;
  }

  // 6. Fibonacci Retracement & Optimal Trade Entry (OTE)
  // Based on current 20-period swing
  const fibLookback = candles.slice(Math.max(0, n - 20));
  let fHigh = -Infinity;
  let fLow = Infinity;
  for (const c of fibLookback) {
    if (c.high > fHigh) fHigh = c.high;
    if (c.low < fLow) fLow = c.low;
  }
  const fDiff = fHigh - fLow;
  if (fDiff > 0) {
    const fib: FibRetracement = {
      high: fHigh,
      low: fLow,
      fib500: fHigh - fDiff * 0.5,
      fib618: fHigh - fDiff * 0.618,
      fib705: fHigh - fDiff * 0.705,
      fib786: fHigh - fDiff * 0.786,
    };
    result.fib = fib;
  }

  return result;
}

/**
 * Checks confluence rules for algorithmic order dispatch:
 * BUY:  oversold + mss_bullish + (bullish_fvg || ifvg_bullish || vimb)
 * SELL: overbought + mss_bearish + (bearish_fvg || ifvg_bearish || vimb)
 */
export function evaluateSignals(
  symbol: string,
  latestPrice: number,
  indicators: TechnicalIndicators,
  structures: InstitutionalStructures
): { shouldBuy: boolean; shouldSell: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const hasBullishStructure =
    structures.bullish_fvg || structures.ifvg_bullish || structures.vimb;
  const hasBearishStructure =
    structures.bearish_fvg || structures.ifvg_bearish || structures.vimb;

  let shouldBuy = false;
  let shouldSell = false;

  if (structures.oversold && structures.mss_bullish && hasBullishStructure) {
    shouldBuy = true;
    reasons.push('Oversold Confluence (RSI < 30, Stoch < 20)');
    reasons.push('Bullish Market Structure Shift (MSS Breakout)');
    if (structures.bullish_fvg) reasons.push('Bullish Fair Value Gap (FVG)');
    if (structures.ifvg_bullish) reasons.push('Inverted Fair Value Gap (iFVG)');
    if (structures.vimb) reasons.push('Volume Imbalance (VIMB)');
  } else if (structures.overbought && structures.mss_bearish && hasBearishStructure) {
    shouldSell = true;
    reasons.push('Overbought Confluence (RSI > 70, Stoch > 80)');
    reasons.push('Bearish Market Structure Shift (MSS Breakdown)');
    if (structures.bearish_fvg) reasons.push('Bearish Fair Value Gap (FVG)');
    if (structures.ifvg_bearish) reasons.push('Inverted Fair Value Gap (iFVG)');
    if (structures.vimb) reasons.push('Volume Imbalance (VIMB)');
  }

  return { shouldBuy, shouldSell, reasons };
}
