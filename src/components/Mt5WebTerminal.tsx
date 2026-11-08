import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Candle,
  Mt5Position,
  AccountState,
  BridgeConfig,
  LogEntry,
  InstitutionalStructures,
} from '../types/trading';
import { SYMBOL_METAS, SYMBOLS } from '../utils/constants';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Folder,
  Layers,
  History,
  FileText,
  PieChart,
  Server,
  Activity,
  ChevronDown,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Settings,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface Mt5WebTerminalProps {
  candlesMap: Record<string, Candle[]>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  positions: Mt5Position[];
  account: AccountState;
  onClosePosition: (ticket: number) => void;
  onCloseAll: (reason?: string) => void;
  onDispatchOrder: (
    symbol: string,
    orderType: 'BUY' | 'SELL',
    directTickets?: number[],
    directPrice?: number
  ) => Promise<void> | void;
  bridgeConfig: BridgeConfig;
  onOpenBridgeModal: () => void;
  logs: LogEntry[];
  structures: InstitutionalStructures;
}

export const Mt5WebTerminal: React.FC<Mt5WebTerminalProps> = ({
  candlesMap,
  selectedSymbol,
  onSelectSymbol,
  positions,
  account,
  onClosePosition,
  onCloseAll,
  onDispatchOrder,
  bridgeConfig,
  onOpenBridgeModal,
  logs,
  structures,
}) => {
  // Chart visual modes
  const [chartType, setChartType] = useState<'candles' | 'bars' | 'line'>('candles');
  const [timeframe, setTimeframe] = useState<'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1'>('M1');
  const [showOneClick, setShowOneClick] = useState(true);
  const [oneClickLot, setOneClickLot] = useState('0.05');
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(45); // number of visible candles
  const [activeToolboxTab, setActiveToolboxTab] = useState<'trade' | 'exposure' | 'history' | 'journal'>('trade');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'marketwatch' | 'navigator'>('marketwatch');
  const [marketWatchFilter, setMarketWatchFilter] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalSymbol, setOrderModalSymbol] = useState(selectedSymbol);
  const [orderModalType, setOrderModalType] = useState<'market' | 'pending'>('market');
  const [orderModalPendingType, setOrderModalPendingType] = useState<'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP'>('BUY_LIMIT');
  const [orderModalVolume, setOrderModalVolume] = useState('0.05');
  const [orderModalSl, setOrderModalSl] = useState('');
  const [orderModalTp, setOrderModalTp] = useState('');
  const [orderModalComment, setOrderModalComment] = useState('MCLLC MT5 Deal');
  const [use4xMultiplier, setUse4xMultiplier] = useState(true);
  const [useEmbeddedWebtrader, setUseEmbeddedWebtrader] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('https://tradingview.deriv.com');

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const selectedMeta = useMemo(
    () => SYMBOL_METAS.find((m) => m.symbol === selectedSymbol) || SYMBOL_METAS[0],
    [selectedSymbol]
  );

  const currentCandles = candlesMap[selectedSymbol] || [];
  const latestCandle = currentCandles[currentCandles.length - 1];
  const currentClose = latestCandle?.close || selectedMeta.defaultPrice;
  const spreadPoints = selectedMeta.spreadPips;
  const spreadDelta = spreadPoints / selectedMeta.pipMultiplier;
  const currentBid = currentClose - spreadDelta / 2;
  const currentAsk = currentClose + spreadDelta / 2;

  // Filtered market watch list
  const filteredSymbols = useMemo(() => {
    return SYMBOL_METAS.filter((m) =>
      m.symbol.toLowerCase().includes(marketWatchFilter.toLowerCase()) ||
      m.name.toLowerCase().includes(marketWatchFilter.toLowerCase())
    );
  }, [marketWatchFilter]);

  // Handle 1-Click order dispatch
  const handleQuickOrder = (type: 'BUY' | 'SELL') => {
    onDispatchOrder(selectedSymbol, type);
  };

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Terminal dark background
    ctx.fillStyle = '#080c16';
    ctx.fillRect(0, 0, width, height);

    if (currentCandles.length === 0) return;

    const priceAxisWidth = 70;
    const timeAxisHeight = 24;
    const chartWidth = width - priceAxisWidth;
    const chartHeight = height - timeAxisHeight;

    const visibleCount = Math.min(currentCandles.length, zoomLevel);
    const startIndex = currentCandles.length - visibleCount;
    const visibleCandles = currentCandles.slice(startIndex);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.08;
    const effectiveMin = minPrice - padding;
    const effectiveMax = maxPrice + padding;
    const effectiveRange = effectiveMax - effectiveMin;

    const getY = (p: number) => chartHeight - ((p - effectiveMin) / effectiveRange) * chartHeight;
    const candleWidth = chartWidth / visibleCount;
    const barWidth = Math.max(2, candleWidth * 0.7);

    // Subtle Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      const y = (chartHeight / 7) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = effectiveMax - (i / 7) * effectiveRange;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal.toFixed(selectedMeta.decimals), chartWidth + 6, y + 3);
    }

    // Draw Candles / Bars / Line
    visibleCandles.forEach((c, idx) => {
      const x = idx * candleWidth + candleWidth / 2;
      const isGreen = c.close >= c.open;
      const bodyTop = getY(Math.max(c.open, c.close));
      const bodyBottom = getY(Math.min(c.open, c.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      if (chartType === 'candles') {
        ctx.strokeStyle = isGreen ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, getY(c.high));
        ctx.lineTo(x, getY(c.low));
        ctx.stroke();

        ctx.fillStyle = isGreen ? '#10b981' : '#f43f5e';
        ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
      } else if (chartType === 'bars') {
        ctx.strokeStyle = isGreen ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, getY(c.high));
        ctx.lineTo(x, getY(c.low));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - barWidth / 2, getY(c.open));
        ctx.lineTo(x, getY(c.open));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, getY(c.close));
        ctx.lineTo(x + barWidth / 2, getY(c.close));
        ctx.stroke();
      } else {
        if (idx === 0) {
          ctx.beginPath();
          ctx.moveTo(x, getY(c.close));
        } else {
          ctx.lineTo(x, getY(c.close));
        }
        if (idx === visibleCandles.length - 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }
    });

    // Bid & Ask Price Lines
    const bidY = getY(currentBid);
    const askY = getY(currentAsk);

    // Bid Line (Gray/Blue)
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bidY);
    ctx.lineTo(chartWidth, bidY);
    ctx.stroke();

    // Ask Line (Rose/Red)
    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, askY);
    ctx.lineTo(chartWidth, askY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tags on right axis
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(chartWidth + 2, askY - 8, priceAxisWidth - 4, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(currentAsk.toFixed(selectedMeta.decimals), chartWidth + 6, askY + 3);

    // Crosshair rendering
    if (showCrosshair && mousePos && mousePos.x < chartWidth && mousePos.y < chartHeight) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const hoveredPrice = effectiveMax - (mousePos.y / chartHeight) * effectiveRange;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(chartWidth + 2, mousePos.y - 8, priceAxisWidth - 4, 16);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(hoveredPrice.toFixed(selectedMeta.decimals), chartWidth + 6, mousePos.y + 3);
    }
  }, [
    currentCandles,
    chartType,
    zoomLevel,
    showCrosshair,
    mousePos,
    currentBid,
    currentAsk,
    selectedMeta.decimals,
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[700px] bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden select-none font-sans">
      {/* 1. MT5 Top Application Menu Bar */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1 flex items-center justify-between text-xs text-neutral-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 font-bold tracking-tight text-white mr-2">
            <span className="text-sky-400">MT5</span>
            <span>WebTerminal</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-400">
            <button className="hover:text-neutral-100 transition-colors">File</button>
            <button className="hover:text-neutral-100 transition-colors">View</button>
            <button className="hover:text-neutral-100 transition-colors">Insert</button>
            <button className="hover:text-neutral-100 transition-colors">Charts</button>
            <button className="hover:text-neutral-100 transition-colors">Options</button>
            <button className="hover:text-neutral-100 transition-colors">Help</button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Bridge Status */}
          <button
            onClick={onOpenBridgeModal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
          >
            <Server className="w-3 h-3 text-sky-400" />
            <span>Deriv MT5:</span>
            <span className={bridgeConfig.isConnected ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
              {bridgeConfig.isConnected ? 'Connected' : 'Bridge Offline'}
            </span>
          </button>

          {/* Deriv WebTrader Embed Mode Switcher */}
          <button
            onClick={() => setUseEmbeddedWebtrader(!useEmbeddedWebtrader)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors border ${
              useEmbeddedWebtrader
                ? 'bg-sky-950/80 border-sky-700 text-sky-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
            }`}
          >
            {useEmbeddedWebtrader ? 'Native Workstation' : 'Deriv WebTrader'}
          </button>
        </div>
      </div>

      {/* 2. MT5 Functional Toolbar */}
      <div className="bg-neutral-900/90 border-b border-neutral-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {/* New Order Button */}
          <button
            onClick={() => {
              setOrderModalSymbol(selectedSymbol);
              setIsOrderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order (F9)</span>
          </button>

          <span className="h-4 w-px bg-neutral-700 mx-1" />

          {/* Chart Types */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800">
            <button
              onClick={() => setChartType('bars')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                chartType === 'bars' ? 'bg-neutral-800 text-sky-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Bar Chart (Alt+1)"
            >
              Bars
            </button>
            <button
              onClick={() => setChartType('candles')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                chartType === 'candles' ? 'bg-neutral-800 text-sky-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Candlesticks (Alt+2)"
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                chartType === 'line' ? 'bg-neutral-800 text-sky-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Line Chart (Alt+3)"
            >
              Line
            </button>
          </div>

          <span className="h-4 w-px bg-neutral-700 mx-1" />

          {/* Timeframes */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 font-mono text-[11px]">
            {(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 py-0.5 rounded ${
                  timeframe === tf ? 'bg-neutral-800 text-sky-400 font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <span className="h-4 w-px bg-neutral-700 mx-1" />

          {/* Crosshair & Zoom */}
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1 rounded border transition-colors ${
              showCrosshair
                ? 'bg-sky-950 border-sky-700 text-sky-400'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Crosshair (Ctrl+F)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(15, z - 10))}
            className="p-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.min(120, z + 10))}
            className="p-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-neutral-400 flex items-center gap-1.5">
            <span>Symbol:</span>
            <span className="text-neutral-100 font-bold">{selectedSymbol}</span>
            <span className="text-neutral-500">·</span>
            <span>Bid:</span>
            <span className="text-neutral-200">{currentBid.toFixed(selectedMeta.decimals)}</span>
            <span className="text-neutral-500">·</span>
            <span>Ask:</span>
            <span className="text-rose-400">{currentAsk.toFixed(selectedMeta.decimals)}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Workstation Center Split (Sidebar + Chart) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Market Watch & Navigator */}
        <div className="w-64 md:w-72 bg-neutral-950 border-r border-neutral-800 flex flex-col shrink-0">
          {/* Sidebar Tabs */}
          <div className="flex items-center border-b border-neutral-800 bg-neutral-900/60 text-xs">
            <button
              onClick={() => setActiveSidebarTab('marketwatch')}
              className={`flex-1 py-1.5 text-center font-medium transition-colors ${
                activeSidebarTab === 'marketwatch'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Market Watch
            </button>
            <button
              onClick={() => setActiveSidebarTab('navigator')}
              className={`flex-1 py-1.5 text-center font-medium transition-colors ${
                activeSidebarTab === 'navigator'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Navigator
            </button>
          </div>

          {activeSidebarTab === 'marketwatch' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Filter */}
              <div className="p-2 border-b border-neutral-800/80 bg-neutral-950">
                <input
                  type="text"
                  value={marketWatchFilter}
                  onChange={(e) => setMarketWatchFilter(e.target.value)}
                  placeholder="Search symbols..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 px-2 py-1 bg-neutral-900/40 border-b border-neutral-800 text-[10px] font-mono text-neutral-500 uppercase">
                <div className="col-span-5">Symbol</div>
                <div className="col-span-3 text-right">Bid</div>
                <div className="col-span-4 text-right">Ask</div>
              </div>

              {/* Symbol Ticker Rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
                {filteredSymbols.map((meta) => {
                  const candles = candlesMap[meta.symbol] || [];
                  const close = candles[candles.length - 1]?.close || meta.defaultPrice;
                  const spr = meta.spreadPips / meta.pipMultiplier;
                  const bid = close - spr / 2;
                  const ask = close + spr / 2;
                  const isSelected = meta.symbol === selectedSymbol;

                  return (
                    <div
                      key={meta.symbol}
                      onClick={() => onSelectSymbol(meta.symbol)}
                      className={`grid grid-cols-12 px-2 py-1.5 text-xs font-mono cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-950/40 text-sky-300 border-l-2 border-sky-400'
                          : 'hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <div className="col-span-5 truncate">
                        <div className="font-semibold text-[11px] truncate">{meta.symbol}</div>
                        <div className="text-[9px] text-neutral-500 truncate">{meta.name}</div>
                      </div>
                      <div className="col-span-3 text-right tabular-nums text-[11px]">
                        {bid.toFixed(meta.decimals)}
                      </div>
                      <div className="col-span-4 text-right tabular-nums text-rose-400 text-[11px]">
                        {ask.toFixed(meta.decimals)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 p-3 overflow-y-auto text-xs text-neutral-400 space-y-3 font-mono">
              <div>
                <div className="font-semibold text-neutral-200 flex items-center gap-1.5 mb-1.5">
                  <Folder className="w-3.5 h-3.5 text-sky-400" />
                  <span>Accounts</span>
                </div>
                <div className="pl-4 space-y-1 text-[11px]">
                  <div className="text-neutral-300">
                    Deriv MT5 #{bridgeConfig.loginId} ({bridgeConfig.server})
                  </div>
                  <div className="text-neutral-500">Server: {bridgeConfig.url}</div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-neutral-200 flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Algorithmic Advisors</span>
                </div>
                <div className="pl-4 space-y-1 text-[11px]">
                  <div className="text-emerald-400">MCLLC Institutional Nano-Bot</div>
                  <div className="text-neutral-500">4x Sub-trade Deal Scaler</div>
                  <div className="text-neutral-500">10% Profit Target Liquidator</div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-neutral-200 flex items-center gap-1.5 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Indicators Active</span>
                </div>
                <div className="pl-4 space-y-1 text-[11px] text-neutral-400">
                  <div>ICT Fair Value Gaps (FVG)</div>
                  <div>Inverted FVG & VIMB</div>
                  <div>RSI (14) & Stochastic (14,3)</div>
                  <div>Optimal Trade Entry (OTE Fib)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Central Chart Workstation */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {useEmbeddedWebtrader ? (
            <div className="flex-1 flex flex-col bg-neutral-950">
              <div className="p-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold text-neutral-200">Deriv WebTrader / MT5 Live Embed:</span>
                  <input
                    type="text"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    className="bg-neutral-950 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-200 font-mono w-72"
                  />
                </div>
                <button
                  onClick={() => setUseEmbeddedWebtrader(false)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs"
                >
                  Return to Native Canvas
                </button>
              </div>
              <iframe
                src={embedUrl}
                title="Deriv MT5 WebTrader"
                className="w-full flex-1 border-0"
                allow="fullscreen"
              />
            </div>
          ) : (
            <>
              {/* 1-Click Trading Floating Panel */}
              {showOneClick && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-1.5 rounded-lg shadow-xl font-mono text-xs">
                  {/* SELL Deal */}
                  <button
                    onClick={() => handleQuickOrder('SELL')}
                    className="flex flex-col items-center justify-center px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded transition-colors group"
                  >
                    <span className="text-[10px] font-bold tracking-wider">SELL</span>
                    <span className="text-xs font-bold tabular-nums">
                      {currentBid.toFixed(selectedMeta.decimals)}
                    </span>
                  </button>

                  {/* Volume Input */}
                  <div className="px-1 text-center">
                    <input
                      type="text"
                      value={oneClickLot}
                      onChange={(e) => setOneClickLot(e.target.value)}
                      className="w-14 bg-neutral-900 border border-neutral-700 rounded text-center py-1 text-xs font-bold text-neutral-100 focus:outline-none"
                    />
                    <div className="text-[9px] text-neutral-500 mt-0.5">4x Nano</div>
                  </div>

                  {/* BUY Deal */}
                  <button
                    onClick={() => handleQuickOrder('BUY')}
                    className="flex flex-col items-center justify-center px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded transition-colors group"
                  >
                    <span className="text-[10px] font-bold tracking-wider">BUY</span>
                    <span className="text-xs font-bold tabular-nums">
                      {currentAsk.toFixed(selectedMeta.decimals)}
                    </span>
                  </button>
                </div>
              )}

              {/* Chart Canvas Viewport */}
              <div
                ref={containerRef}
                className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden"
              >
                <canvas
                  ref={canvasRef}
                  onMouseMove={(e) => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) {
                      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }
                  }}
                  onMouseLeave={() => setMousePos(null)}
                  className="w-full h-full block"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Bottom Dock: MT5 Toolbox (Trade / Exposure / History / Journal) */}
      <div className="h-56 bg-neutral-950 border-t border-neutral-800 flex flex-col shrink-0">
        {/* Toolbox Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/60 px-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveToolboxTab('trade')}
              className={`py-1.5 px-3 font-medium transition-colors flex items-center gap-1.5 ${
                activeToolboxTab === 'trade'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Trade ({positions.length})</span>
            </button>
            <button
              onClick={() => setActiveToolboxTab('exposure')}
              className={`py-1.5 px-3 font-medium transition-colors flex items-center gap-1.5 ${
                activeToolboxTab === 'exposure'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Exposure</span>
            </button>
            <button
              onClick={() => setActiveToolboxTab('history')}
              className={`py-1.5 px-3 font-medium transition-colors flex items-center gap-1.5 ${
                activeToolboxTab === 'history'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
            <button
              onClick={() => setActiveToolboxTab('journal')}
              className={`py-1.5 px-3 font-medium transition-colors flex items-center gap-1.5 ${
                activeToolboxTab === 'journal'
                  ? 'bg-neutral-950 text-sky-400 border-b-2 border-sky-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Journal</span>
            </button>
          </div>

          {positions.length > 0 && (
            <button
              onClick={() => onCloseAll('Toolbox Close All')}
              className="px-2 py-0.5 text-[11px] font-semibold bg-rose-600/80 hover:bg-rose-500 text-white rounded transition-colors"
            >
              Liquidate All Deals
            </button>
          )}
        </div>

        {/* Toolbox Content */}
        <div className="flex-1 overflow-y-auto">
          {activeToolboxTab === 'trade' && (
            <div className="text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-neutral-900/40 border-b border-neutral-800 text-[10px] text-neutral-500 uppercase">
                  <tr>
                    <th className="px-3 py-1">Ticket</th>
                    <th className="px-2 py-1">Time</th>
                    <th className="px-2 py-1">Type</th>
                    <th className="px-2 py-1">Volume</th>
                    <th className="px-2 py-1">Symbol</th>
                    <th className="px-2 py-1 text-right">Price</th>
                    <th className="px-2 py-1 text-right">S / L</th>
                    <th className="px-2 py-1 text-right">T / P</th>
                    <th className="px-2 py-1 text-right">Current</th>
                    <th className="px-2 py-1 text-right">Profit ($)</th>
                    <th className="px-2 py-1 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-[11px]">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-neutral-500">
                        No active open positions. Open a deal using One-Click Trading or New Order (F9).
                      </td>
                    </tr>
                  ) : (
                    positions.map((p) => {
                      const meta = SYMBOL_METAS.find((m) => m.symbol === p.symbol) || selectedMeta;
                      const isProfit = p.profit >= 0;
                      return (
                        <tr key={p.ticket} className="hover:bg-neutral-900/40">
                          <td className="px-3 py-1 font-semibold text-neutral-300">#{p.ticket}</td>
                          <td className="px-2 py-1 text-neutral-500">
                            {new Date(p.openTime).toISOString().substring(11, 19)}
                          </td>
                          <td className={`px-2 py-1 font-semibold ${p.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.type}
                          </td>
                          <td className="px-2 py-1 text-neutral-300">{p.volume.toFixed(2)}</td>
                          <td className="px-2 py-1 text-neutral-200 font-semibold">{p.symbol}</td>
                          <td className="px-2 py-1 text-right text-neutral-300">{p.price.toFixed(meta.decimals)}</td>
                          <td className="px-2 py-1 text-right text-neutral-500">{p.sl ? p.sl.toFixed(meta.decimals) : '0.00'}</td>
                          <td className="px-2 py-1 text-right text-neutral-500">{p.tp ? p.tp.toFixed(meta.decimals) : '0.00'}</td>
                          <td className="px-2 py-1 text-right text-neutral-200">{p.currentPrice.toFixed(meta.decimals)}</td>
                          <td className={`px-2 py-1 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${p.profit.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              onClick={() => onClosePosition(p.ticket)}
                              className="text-neutral-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                              title="Close position"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeToolboxTab === 'exposure' && (
            <div className="p-4 text-xs font-mono space-y-3">
              <div className="text-neutral-400 font-semibold">Active Volume Exposure per Instrument:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  positions.reduce((acc, p) => {
                    acc[p.symbol] = (acc[p.symbol] || 0) + p.volume;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([sym, vol]) => (
                  <div key={sym} className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
                    <div className="text-neutral-400 text-[10px] uppercase">{sym}</div>
                    <div className="text-neutral-100 font-bold text-sm mt-0.5">{vol.toFixed(2)} Lots</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeToolboxTab === 'history' && (
            <div className="p-4 text-xs font-mono space-y-2">
              <div className="text-neutral-400 font-semibold">Closed Trades & Realized P&L:</div>
              <div className="p-3 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-between">
                <span>Total Realized Profit / Loss:</span>
                <span className={`font-bold ${account.totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {account.totalRealizedProfit >= 0 ? '+' : ''}${account.totalRealizedProfit.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {activeToolboxTab === 'journal' && (
            <div className="p-2 text-[11px] font-mono divide-y divide-neutral-900">
              {logs.slice(-20).map((log) => (
                <div key={log.id} className="py-1 px-2 flex items-start gap-2 hover:bg-neutral-900/40">
                  <span className="text-neutral-500 shrink-0">{log.timestamp}</span>
                  <span
                    className={`font-semibold shrink-0 text-[10px] px-1 rounded ${
                      log.type === 'EXECUTION'
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : log.type === 'RISK'
                        ? 'text-amber-400 bg-amber-950/40'
                        : 'text-neutral-400 bg-neutral-900'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="text-neutral-300 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar Summary (Balance, Equity, Margin, Free Margin) */}
        <div className="px-3 py-1.5 bg-neutral-900/90 border-t border-neutral-800 flex flex-wrap items-center justify-between text-xs font-mono text-neutral-300">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-neutral-500">Balance:</span>{' '}
              <span className="font-semibold text-neutral-100">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-neutral-500">Equity:</span>{' '}
              <span className={`font-semibold ${account.equity >= account.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Margin:</span>{' '}
              <span className="text-neutral-300">${account.margin.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-neutral-500">Free Margin:</span>{' '}
              <span className="text-neutral-300">${account.freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Target Profit (10%):</span>
            <span className="text-sky-400 font-semibold">${account.targetProfitAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. MT5 Order Ticket Dialog Modal (F9) */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative font-sans">
            <button
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2.5 mb-5 border-b border-neutral-800 pb-3">
              <div className="p-2 bg-sky-950 text-sky-400 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">Order Ticket (F9)</h3>
                <p className="text-xs text-neutral-400 font-mono">MetaTrader 5 Deal Dispatcher</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 text-[11px]">Symbol</label>
                  <select
                    value={orderModalSymbol}
                    onChange={(e) => setOrderModalSymbol(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-bold focus:outline-none focus:border-sky-500"
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 text-[11px]">Execution Type</label>
                  <select
                    value={orderModalType}
                    onChange={(e) => setOrderModalType(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="market">Market Execution</option>
                    <option value="pending">Pending Order</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 text-[11px]">Volume (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderModalVolume}
                    onChange={(e) => setOrderModalVolume(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-bold focus:outline-none focus:border-sky-500"
                    placeholder="0.05"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                    <input
                      type="checkbox"
                      checked={use4xMultiplier}
                      onChange={(e) => setUse4xMultiplier(e.target.checked)}
                      className="rounded bg-neutral-950 border-neutral-700 text-sky-500 focus:ring-0"
                    />
                    <span className="text-[11px]">4x Nano-trade Loop</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 text-[11px]">Stop Loss</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderModalSl}
                    onChange={(e) => setOrderModalSl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 text-[11px]">Take Profit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderModalTp}
                    onChange={(e) => setOrderModalTp(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 text-[11px]">Comment</label>
                <input
                  type="text"
                  value={orderModalComment}
                  onChange={(e) => setOrderModalComment(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Action Buttons: Big Dual-Sided MT5 Execution Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  onClick={() => {
                    onDispatchOrder(orderModalSymbol, 'SELL');
                    setIsOrderModalOpen(false);
                  }}
                  className="py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold transition-colors flex flex-col items-center shadow-lg"
                >
                  <span className="text-xs uppercase tracking-wider">Sell by Market</span>
                  <span className="text-sm font-bold tabular-nums mt-0.5">
                    {currentBid.toFixed(selectedMeta.decimals)}
                  </span>
                </button>

                <button
                  onClick={() => {
                    onDispatchOrder(orderModalSymbol, 'BUY');
                    setIsOrderModalOpen(false);
                  }}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors flex flex-col items-center shadow-lg"
                >
                  <span className="text-xs uppercase tracking-wider">Buy by Market</span>
                  <span className="text-sm font-bold tabular-nums mt-0.5">
                    {currentAsk.toFixed(selectedMeta.decimals)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
