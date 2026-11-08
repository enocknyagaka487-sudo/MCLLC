import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle, TechnicalIndicators, InstitutionalStructures, Mt5Position, SymbolMeta } from '../types/trading';

interface InteractiveChartProps {
  symbolMeta: SymbolMeta;
  candles: Candle[];
  indicators: TechnicalIndicators;
  structures: InstitutionalStructures;
  rsiValues: number[];
  stochKValues: number[];
  stochDValues: number[];
  ema20Values: number[];
  ema50Values: number[];
  positions: Mt5Position[];
  onManualOrder?: (type: 'BUY' | 'SELL') => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  symbolMeta,
  candles,
  indicators,
  structures,
  rsiValues,
  stochKValues,
  stochDValues,
  ema20Values,
  ema50Values,
  positions,
  onManualOrder,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [showFvg, setShowFvg] = useState(true);
  const [showMss, setShowMss] = useState(true);
  const [showFib, setShowFib] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [activeTab, setActiveTab] = useState<'RSI' | 'STOCH'>('RSI');

  // Open positions on this symbol
  const symbolPositions = useMemo(
    () => positions.filter((p) => p.symbol === symbolMeta.symbol),
    [positions, symbolMeta.symbol]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support devicePixelRatio for razor-sharp rendering on Retina screens
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const priceAxisWidth = 65;
    const chartHeight = height - 120; // Main chart
    const subChartHeight = 80;
    const subChartTop = chartHeight + 20;
    const chartWidth = width - priceAxisWidth;

    // Clear background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) return;

    // Visible window: last 45 candles
    const visibleCount = Math.min(candles.length, 45);
    const startIndex = candles.length - visibleCount;
    const visibleCandles = candles.slice(startIndex);
    const visibleEma20 = ema20Values.slice(startIndex);
    const visibleEma50 = ema50Values.slice(startIndex);

    // Min and Max prices with 5% padding
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    if (structures.swingHigh && structures.swingHigh > maxPrice) maxPrice = structures.swingHigh;
    if (structures.swingLow && structures.swingLow < minPrice) minPrice = structures.swingLow;

    const priceSpan = maxPrice - minPrice || 1;
    const padding = priceSpan * 0.08;
    const effectiveMin = minPrice - padding;
    const effectiveMax = maxPrice + padding;
    const effectiveSpan = effectiveMax - effectiveMin;

    const getY = (val: number) => {
      return chartHeight - ((val - effectiveMin) / effectiveSpan) * chartHeight;
    };

    const candleSlotWidth = chartWidth / visibleCount;
    const candleBodyWidth = Math.max(3, candleSlotWidth * 0.7);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const y = (chartHeight / priceSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = effectiveMax - (effectiveSpan / priceSteps) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal.toFixed(symbolMeta.decimals), chartWidth + 6, y + 3);
    }

    // 1. Draw Institutional FVG Zones
    if (showFvg && structures.activeFvgZone) {
      const zone = structures.activeFvgZone;
      const yTop = getY(zone.top);
      const yBottom = getY(zone.bottom);
      const zoneHeight = Math.abs(yBottom - yTop);
      const zoneY = Math.min(yTop, yBottom);

      // Gradient box for FVG
      if (zone.type === 'bullish') {
        ctx.fillStyle = zone.inverted
          ? 'rgba(234, 179, 8, 0.15)'
          : 'rgba(34, 197, 94, 0.14)';
        ctx.strokeStyle = zone.inverted
          ? 'rgba(234, 179, 8, 0.6)'
          : 'rgba(34, 197, 94, 0.6)';
      } else {
        ctx.fillStyle = zone.inverted
          ? 'rgba(234, 179, 8, 0.15)'
          : 'rgba(239, 68, 68, 0.14)';
        ctx.strokeStyle = zone.inverted
          ? 'rgba(234, 179, 8, 0.6)'
          : 'rgba(239, 68, 68, 0.6)';
      }

      ctx.fillRect(0, zoneY, chartWidth, zoneHeight);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(0, zoneY, chartWidth, zoneHeight);
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = zone.inverted
        ? '#facc15'
        : zone.type === 'bullish'
        ? '#4ade80'
        : '#f87171';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const labelText = zone.inverted
        ? `iFVG Inverted (${zone.type.toUpperCase()})`
        : `ICT FVG (${zone.type.toUpperCase()})`;
      ctx.fillText(labelText, chartWidth - 8, zoneY + 14);
    }

    // 2. Draw Fibonacci Retracement (OTE)
    if (showFib && structures.fib) {
      const { fib500, fib618, fib705, fib786 } = structures.fib;
      const levels = [
        { label: '50.0% EQ', val: fib500, color: 'rgba(148, 163, 184, 0.5)' },
        { label: '61.8% OTE', val: fib618, color: 'rgba(56, 189, 248, 0.7)' },
        { label: '70.5% SWEET', val: fib705, color: 'rgba(168, 85, 247, 0.8)' },
        { label: '78.6% OTE', val: fib786, color: 'rgba(244, 63, 94, 0.7)' },
      ];

      levels.forEach(({ label, val, color }) => {
        const y = getY(val);
        if (y >= 0 && y <= chartHeight) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = color;
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`FIB ${label} : ${val.toFixed(symbolMeta.decimals)}`, 6, y - 3);
        }
      });
    }

    // 3. Draw Market Structure Shift (MSS)
    if (showMss && structures.swingHigh && structures.mss_bullish) {
      const y = getY(structures.swingHigh);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`▲ MSS BULLISH BREAKOUT [${structures.swingHigh.toFixed(symbolMeta.decimals)}]`, 12, y - 4);
    } else if (showMss && structures.swingLow && structures.mss_bearish) {
      const y = getY(structures.swingLow);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`▼ MSS BEARISH BREAKDOWN [${structures.swingLow.toFixed(symbolMeta.decimals)}]`, 12, y + 12);
    }

    // 4. Draw EMAs
    if (showEma) {
      // EMA 20 (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      visibleEma20.forEach((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // EMA 50 (Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      visibleEma50.forEach((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 5. Draw Candlesticks
    visibleCandles.forEach((c, idx) => {
      const x = idx * candleSlotWidth + candleSlotWidth / 2;
      const isBullish = c.close >= c.open;
      const candleColor = isBullish ? '#10b981' : '#f43f5e';

      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const yHigh = getY(c.high);
      const yLow = getY(c.low);

      // Wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleBodyWidth / 2, bodyTop, candleBodyWidth, bodyHeight);
    });

    // 6. Draw Open Position Entry Lines (MCLLC 4x 0.05 lot batch)
    symbolPositions.forEach((pos) => {
      const y = getY(pos.price);
      if (y >= 0 && y <= chartHeight) {
        ctx.strokeStyle = pos.type === 'BUY' ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge
        ctx.fillStyle = pos.type === 'BUY' ? '#064e3b' : '#881337';
        ctx.fillRect(chartWidth - 140, y - 9, 134, 18);
        ctx.strokeStyle = pos.type === 'BUY' ? '#10b981' : '#f43f5e';
        ctx.strokeRect(chartWidth - 140, y - 9, 134, 18);

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${pos.type} 0.05 #${pos.ticket % 1000} ${pos.profit >= 0 ? '+' : ''}$${pos.profit.toFixed(2)}`,
          chartWidth - 136,
          y + 3
        );
      }
    });

    // 7. Latest Price Line
    const latestCandle = visibleCandles[visibleCandles.length - 1];
    const currentPriceY = getY(latestCandle.close);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, currentPriceY);
    ctx.lineTo(chartWidth, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag on axis
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(chartWidth + 2, currentPriceY - 8, priceAxisWidth - 4, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(latestCandle.close.toFixed(symbolMeta.decimals), chartWidth + 6, currentPriceY + 4);

    // ==========================================
    // 8. SUB-CHART (RSI or Stochastic Oscillator)
    // ==========================================
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, subChartTop, chartWidth, subChartHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeRect(0, subChartTop, chartWidth, subChartHeight);

    if (activeTab === 'RSI') {
      const visibleRsi = rsiValues.slice(startIndex);
      const getRsiY = (val: number) => subChartTop + subChartHeight - (val / 100) * subChartHeight;

      // Bands: 70 Overbought, 30 Oversold
      const y70 = getRsiY(70);
      const y30 = getRsiY(30);

      // Oversold / overbought zones fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(0, subChartTop, chartWidth, y70 - subChartTop);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.fillRect(0, y30, chartWidth, subChartTop + subChartHeight - y30);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartWidth, y70);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, y30);
      ctx.lineTo(chartWidth, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      // RSI Curve
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      visibleRsi.forEach((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getRsiY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('70 OB', chartWidth + 6, y70 + 3);
      ctx.fillText('30 OS', chartWidth + 6, y30 + 3);
      ctx.fillText(
        `RSI: ${indicators.rsi.toFixed(1)}`,
        chartWidth + 6,
        subChartTop + subChartHeight - 4
      );
    } else {
      // Stochastic %K (Cyan) & %D (Orange)
      const visibleK = stochKValues.slice(startIndex);
      const visibleD = stochDValues.slice(startIndex);
      const getStochY = (val: number) => subChartTop + subChartHeight - (val / 100) * subChartHeight;

      const y80 = getStochY(80);
      const y20 = getStochY(20);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y80);
      ctx.lineTo(chartWidth, y80);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, y20);
      ctx.lineTo(chartWidth, y20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Stoch %K
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      visibleK.forEach((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getStochY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Stoch %D
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      visibleD.forEach((val, idx) => {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        const y = getStochY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('80 OB', chartWidth + 6, y80 + 3);
      ctx.fillText('20 OS', chartWidth + 6, y20 + 3);
      ctx.fillText(
        `%K:${indicators.stochK.toFixed(0)} %D:${indicators.stochD.toFixed(0)}`,
        chartWidth + 6,
        subChartTop + subChartHeight - 4
      );
    }

    // Crosshair rendering
    if (crosshairPos && crosshairPos.x < chartWidth && crosshairPos.y < chartHeight) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, chartHeight);
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(chartWidth, crosshairPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price at cursor
      const cursorPrice = effectiveMax - (crosshairPos.y / chartHeight) * effectiveSpan;
      ctx.fillStyle = '#334155';
      ctx.fillRect(chartWidth + 2, crosshairPos.y - 7, priceAxisWidth - 4, 14);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(cursorPrice.toFixed(symbolMeta.decimals), chartWidth + 6, crosshairPos.y + 4);
    }
  }, [
    candles,
    indicators,
    structures,
    rsiValues,
    stochKValues,
    stochDValues,
    ema20Values,
    ema50Values,
    symbolMeta,
    symbolPositions,
    showFvg,
    showMss,
    showFib,
    showEma,
    activeTab,
    crosshairPos,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshairPos({ x, y });

    const chartWidth = rect.width - 65;
    const visibleCount = Math.min(candles.length, 45);
    const slotWidth = chartWidth / visibleCount;
    const candleIndex = Math.floor(x / slotWidth);
    if (candleIndex >= 0 && candleIndex < visibleCount) {
      const actualIndex = candles.length - visibleCount + candleIndex;
      setHoverIndex(actualIndex);
    }
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
    setHoverIndex(null);
  };

  const hoveredCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Chart Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-neutral-100 text-sm">{symbolMeta.symbol}</span>
            <span className="text-neutral-400 text-xs hidden sm:inline">{symbolMeta.name}</span>
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          {/* OHLC Bar */}
          {hoveredCandle && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
              <span>O: <span className="text-neutral-200">{hoveredCandle.open.toFixed(symbolMeta.decimals)}</span></span>
              <span>H: <span className="text-emerald-400">{hoveredCandle.high.toFixed(symbolMeta.decimals)}</span></span>
              <span>L: <span className="text-rose-400">{hoveredCandle.low.toFixed(symbolMeta.decimals)}</span></span>
              <span>C: <span className="text-neutral-200">{hoveredCandle.close.toFixed(symbolMeta.decimals)}</span></span>
            </div>
          )}
        </div>

        {/* Overlay Toggles & Sub-indicator Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 font-mono text-[11px]">
            <button
              onClick={() => setShowFvg(!showFvg)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showFvg ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              FVG/iFVG
            </button>
            <button
              onClick={() => setShowMss(!showMss)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showMss ? 'bg-neutral-800 text-sky-400 font-medium' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              MSS
            </button>
            <button
              onClick={() => setShowFib(!showFib)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showFib ? 'bg-neutral-800 text-purple-400 font-medium' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              FIB OTE
            </button>
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showEma ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              EMA 20/50
            </button>
          </div>

          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 font-mono text-[11px]">
            <button
              onClick={() => setActiveTab('RSI')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'RSI' ? 'bg-purple-950/80 text-purple-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              RSI (14)
            </button>
            <button
              onClick={() => setActiveTab('STOCH')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeTab === 'STOCH' ? 'bg-sky-950/80 text-sky-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              STOCH (14,3)
            </button>
          </div>

          {onManualOrder && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() => onManualOrder('BUY')}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors shadow-sm"
              >
                BUY 4x 0.05
              </button>
              <button
                onClick={() => onManualOrder('SELL')}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors shadow-sm"
              >
                SELL 4x 0.05
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Chart */}
      <div ref={containerRef} className="relative flex-1 w-full min-h-[380px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Legend Overlay */}
        <div className="absolute top-2 left-3 flex flex-wrap items-center gap-3 text-[11px] font-mono pointer-events-none bg-neutral-950/85 px-2.5 py-1 rounded border border-neutral-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-emerald-500"></span>
            <span className="text-neutral-400">Bullish FVG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-rose-500"></span>
            <span className="text-neutral-400">Bearish FVG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-400"></span>
            <span className="text-neutral-400">iFVG / VIMB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400"></span>
            <span className="text-cyan-400">EMA20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400"></span>
            <span className="text-amber-400">EMA50</span>
          </div>
          {structures.oversold && (
            <span className="text-emerald-400 font-semibold">[OVERSOLD CONFLUENCE]</span>
          )}
          {structures.overbought && (
            <span className="text-rose-400 font-semibold">[OVERBOUGHT CONFLUENCE]</span>
          )}
        </div>
      </div>
    </div>
  );
};
