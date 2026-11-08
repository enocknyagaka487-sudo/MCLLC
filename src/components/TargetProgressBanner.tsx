import React from 'react';
import { AccountState } from '../types/trading';
import { Target, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TargetProgressBannerProps {
  account: AccountState;
  onLiquidateAll: () => void;
  openPositionsCount: number;
}

export const TargetProgressBanner: React.FC<TargetProgressBannerProps> = ({
  account,
  onLiquidateAll,
  openPositionsCount,
}) => {
  const targetProfit = account.targetProfitAmount; // $1000 for $10,000 balance
  const currentProfit = account.profit; // equity - balance
  const progressPercent = Math.min(100, Math.max(0, (currentProfit / targetProfit) * 100));
  const isTargetHit = currentProfit >= targetProfit;

  return (
    <div className={`border rounded-lg p-3.5 transition-all ${
      isTargetHit
        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
        : 'bg-neutral-900 border-neutral-800'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Metric Overview */}
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded ${isTargetHit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-sky-400'}`}>
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-neutral-400 font-medium">10% Profit Target Rule</div>
              <div className="text-neutral-100 font-semibold font-mono text-sm">
                +${targetProfit.toFixed(2)} Target Goal
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-neutral-800 hidden sm:block" />

          <div>
            <div className="text-neutral-400">Account Balance</div>
            <div className="font-mono text-neutral-100 font-medium">
              ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-neutral-400">Live Equity</div>
            <div className="font-mono text-neutral-100 font-medium">
              ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-neutral-400">Floating P&L</div>
            <div className={`font-mono font-semibold ${currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)} ({((currentProfit / account.balance) * 100).toFixed(2)}%)
            </div>
          </div>

          <div>
            <div className="text-neutral-400">Target Milestones Hit</div>
            <div className="font-mono text-neutral-200">
              {account.liquidationsCount} cycle{account.liquidationsCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Action Button & Status */}
        <div className="flex items-center gap-3 shrink-0">
          {isTargetHit ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold animate-pulse">
              <ShieldCheck className="w-4 h-4" />
              <span>10% TARGET MET — AUTO-LIQUIDATING</span>
            </div>
          ) : (
            <div className="text-neutral-400 text-xs font-mono">
              Need: +${Math.max(0, targetProfit - currentProfit).toFixed(2)}
            </div>
          )}

          {openPositionsCount > 0 && (
            <button
              onClick={onLiquidateAll}
              className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900 rounded transition-colors whitespace-nowrap"
            >
              Liquidate All ({openPositionsCount})
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar towards 10% */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
          <span>Target Progress ({progressPercent.toFixed(1)}%)</span>
          <span>Target: 10.0% of Balance (${targetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
        </div>
        <div className="relative w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className={`h-full transition-all duration-300 ${
              isTargetHit
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : progressPercent > 50
                ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                : 'bg-gradient-to-r from-neutral-600 to-sky-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
