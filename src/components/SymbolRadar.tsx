import React from 'react';
import { SymbolMeta, TechnicalIndicators, InstitutionalStructures } from '../types/trading';
import { TrendingUp, TrendingDown, Radio, Zap } from 'lucide-react';

interface SymbolCardData {
  meta: SymbolMeta;
  price: number;
  bid: number;
  ask: number;
  change24h: number;
  indicators: TechnicalIndicators;
  structures: InstitutionalStructures;
  shouldBuy: boolean;
  shouldSell: boolean;
}

interface SymbolRadarProps {
  symbolsData: SymbolCardData[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onDispatchOrder: (symbol: string, type: 'BUY' | 'SELL') => void;
}

export const SymbolRadar: React.FC<SymbolRadarProps> = ({
  symbolsData,
  selectedSymbol,
  onSelectSymbol,
  onDispatchOrder,
}) => {
  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-neutral-100">Multi-Market Scanner</span>
          <span className="font-mono text-neutral-400">(10 Instruments)</span>
        </div>
        <span className="text-[11px] font-mono text-neutral-400">30s Sub-Candle Loop</span>
      </div>

      {/* Grid of Symbol Cards */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 overflow-y-auto max-h-[420px]">
        {symbolsData.map((item) => {
          const isSelected = item.meta.symbol === selectedSymbol;
          const isBuy = item.shouldBuy;
          const isSell = item.shouldSell;

          return (
            <div
              key={item.meta.symbol}
              onClick={() => onSelectSymbol(item.meta.symbol)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-neutral-800/90 border-sky-500 shadow-sm'
                  : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              {/* Top Row: Symbol & Category */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="font-semibold text-xs text-neutral-100 truncate">
                  {item.meta.symbol}
                </div>
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                  {item.meta.category}
                </span>
              </div>

              {/* Price & Spread */}
              <div className="flex items-baseline justify-between mb-2 font-mono">
                <span className="text-sm font-bold text-neutral-100">
                  {item.price.toFixed(item.meta.decimals)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Sprd: {item.meta.spreadPips}p
                </span>
              </div>

              {/* Indicators: RSI & Stoch */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono mb-2 text-neutral-400 bg-neutral-900/60 p-1.5 rounded">
                <div>
                  <span className="text-neutral-500">RSI: </span>
                  <span
                    className={
                      item.indicators.rsi < 30
                        ? 'text-emerald-400 font-bold'
                        : item.indicators.rsi > 70
                        ? 'text-rose-400 font-bold'
                        : 'text-neutral-200'
                    }
                  >
                    {item.indicators.rsi.toFixed(0)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">%K: </span>
                  <span
                    className={
                      item.indicators.stochK < 20
                        ? 'text-emerald-400 font-bold'
                        : item.indicators.stochK > 80
                        ? 'text-rose-400 font-bold'
                        : 'text-neutral-200'
                    }
                  >
                    {item.indicators.stochK.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Institutional Structure Tags */}
              <div className="flex flex-wrap gap-1 mb-2.5 min-h-[18px]">
                {item.structures.bullish_fvg && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/70 px-1 py-0.2 rounded border border-emerald-800/60">
                    +FVG
                  </span>
                )}
                {item.structures.bearish_fvg && (
                  <span className="text-[9px] font-mono text-rose-400 bg-rose-950/70 px-1 py-0.2 rounded border border-rose-800/60">
                    -FVG
                  </span>
                )}
                {item.structures.ifvg_bullish && (
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-950/70 px-1 py-0.2 rounded border border-amber-800/60">
                    +iFVG
                  </span>
                )}
                {item.structures.ifvg_bearish && (
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-950/70 px-1 py-0.2 rounded border border-amber-800/60">
                    -iFVG
                  </span>
                )}
                {item.structures.vimb && (
                  <span className="text-[9px] font-mono text-sky-400 bg-sky-950/70 px-1 py-0.2 rounded border border-sky-800/60">
                    VIMB
                  </span>
                )}
                {item.structures.mss_bullish && (
                  <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-700">
                    MSS▲
                  </span>
                )}
                {item.structures.mss_bearish && (
                  <span className="text-[9px] font-mono text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-700">
                    MSS▼
                  </span>
                )}
              </div>

              {/* Signal Status or Action */}
              <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                {isBuy ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                    <Zap className="w-3 h-3" /> BUY SIGNAL
                  </span>
                ) : isSell ? (
                  <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 animate-pulse">
                    <Zap className="w-3 h-3" /> SELL SIGNAL
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-500">Scanning...</span>
                )}

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDispatchOrder(item.meta.symbol, 'BUY')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white rounded transition-colors"
                    title="Manual Buy 4x 0.05"
                  >
                    B
                  </button>
                  <button
                    onClick={() => onDispatchOrder(item.meta.symbol, 'SELL')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-600/80 hover:bg-rose-500 text-white rounded transition-colors"
                    title="Manual Sell 4x 0.05"
                  >
                    S
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
