import React, { useState } from 'react';
import { Mt5Position } from '../types/trading';
import { X, Layers, ExternalLink, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface ActivePositionsTableProps {
  positions: Mt5Position[];
  onClosePosition: (ticket: number) => void;
  onCloseBatch: (batchId: string) => void;
  onLiquidateAll: () => void;
}

export const ActivePositionsTable: React.FC<ActivePositionsTableProps> = ({
  positions,
  onClosePosition,
  onCloseBatch,
  onLiquidateAll,
}) => {
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');

  const symbols = Array.from(new Set(positions.map((p) => p.symbol)));
  const filtered = filterSymbol === 'ALL' ? positions : positions.filter((p) => p.symbol === filterSymbol);

  const totalVolume = filtered.reduce((acc, p) => acc + p.volume, 0);
  const totalProfit = filtered.reduce((acc, p) => acc + p.profit, 0);

  // Group by batchId to illustrate 4x 0.05 nano-trades
  const batchMap = new Map<string, Mt5Position[]>();
  filtered.forEach((p) => {
    const list = batchMap.get(p.batchId) || [];
    list.push(p);
    batchMap.set(p.batchId, list);
  });

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Table Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-100">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>MT5 Open Positions</span>
            <span className="font-mono text-neutral-400">({positions.length} Sub-Trades)</span>
          </div>

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Symbol filter */}
          {symbols.length > 0 && (
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <button
                onClick={() => setFilterSymbol('ALL')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterSymbol === 'ALL'
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All
              </button>
              {symbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setFilterSymbol(sym)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterSymbol === sym
                      ? 'bg-neutral-800 text-sky-400 font-medium'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aggregates & Batch Actions */}
        <div className="flex items-center gap-4">
          <div className="font-mono text-[11px] text-neutral-300">
            <span className="text-neutral-400">Total Volume: </span>
            <span className="font-semibold text-neutral-100">{totalVolume.toFixed(2)} Lots</span>
            <span className="mx-2 text-neutral-600">|</span>
            <span className="text-neutral-400">Floating: </span>
            <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </span>
          </div>

          {positions.length > 0 && (
            <button
              onClick={onLiquidateAll}
              className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/80 hover:bg-rose-900 rounded transition-colors"
            >
              Close All
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[360px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 text-xs">
            <p className="font-mono text-neutral-400 mb-1">No active MT5 positions open</p>
            <p className="text-neutral-500 max-w-sm">
              The 30-second evaluation engine is scanning for FVG, iFVG, VIMB, and MSS confluences to dispatch 4x 0.05 lot nano-trades.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60 font-mono text-[11px] text-neutral-400 sticky top-0 z-10">
                <th className="py-2 px-3 font-medium">Ticket #</th>
                <th className="py-2 px-3 font-medium">Symbol</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Volume</th>
                <th className="py-2 px-3 font-medium text-right">Open Price</th>
                <th className="py-2 px-3 font-medium text-right">Current</th>
                <th className="py-2 px-3 font-medium text-right">Profit ($)</th>
                <th className="py-2 px-3 font-medium">Comment</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {filtered.map((pos) => {
                const isProfitable = pos.profit >= 0;
                return (
                  <tr
                    key={pos.ticket}
                    className="hover:bg-neutral-800/30 transition-colors text-[11px]"
                  >
                    <td className="py-2 px-3 text-neutral-300">#{pos.ticket}</td>
                    <td className="py-2 px-3 font-semibold text-neutral-100">{pos.symbol}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          pos.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pos.type === 'BUY' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {pos.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-neutral-200">{pos.volume.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-neutral-300">{pos.price.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right text-neutral-100">{pos.currentPrice.toFixed(4)}</td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        isProfitable ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfitable ? '+' : ''}${pos.profit.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-neutral-400 text-[10px]">{pos.comment}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onClosePosition(pos.ticket)}
                        className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                        title="Close this ticket"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
