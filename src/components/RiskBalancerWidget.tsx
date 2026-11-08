import React from 'react';
import { Scale, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { RiskBalancerState } from '../types/trading';

interface RiskBalancerWidgetProps {
  balancerState: RiskBalancerState;
  totalPositions: number;
  riskLiquidationsCount: number;
}

export const RiskBalancerWidget: React.FC<RiskBalancerWidgetProps> = ({
  balancerState,
  totalPositions,
  riskLiquidationsCount,
}) => {
  const { losingCount, profitableCount, netProfit, isRuleSatisfied } = balancerState;

  const losingMet = losingCount >= 1;
  const profitMet = profitableCount >= 2;
  const netPositive = netProfit > 0;

  return (
    <div className={`border rounded-lg p-3.5 transition-all ${
      isRuleSatisfied
        ? 'bg-amber-950/30 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
        : 'bg-neutral-900 border-neutral-800'
    }`}>
      {/* Title & Info */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-500/20 text-amber-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
              <span>MCLLC Risk Balancer</span>
              {isRuleSatisfied && (
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                  TRIGGERED
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-400">
              Rule: 1 Loss balanced by &ge;2 Profits with Net +$
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono">
          <span className="text-neutral-400">Balanced Closes: </span>
          <span className="text-neutral-200 font-semibold">{riskLiquidationsCount}</span>
        </div>
      </div>

      {/* 3 Prerequisite Condition Meters */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {/* Cond 1: Losing >= 1 */}
        <div className={`p-2 rounded border ${
          losingMet ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
        }`}>
          <div className="text-[10px] uppercase font-mono tracking-wider mb-0.5">Condition 1</div>
          <div className="font-mono text-xs font-semibold flex items-center justify-center gap-1">
            <span>Losses: {losingCount}</span>
            <span className="text-[10px] opacity-75">(&ge;1 req)</span>
          </div>
          <div className="text-[10px] mt-0.5 font-medium">
            {losingMet ? '✓ Satisfied' : 'Waiting'}
          </div>
        </div>

        {/* Cond 2: Profitable >= 2 */}
        <div className={`p-2 rounded border ${
          profitMet ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
        }`}>
          <div className="text-[10px] uppercase font-mono tracking-wider mb-0.5">Condition 2</div>
          <div className="font-mono text-xs font-semibold flex items-center justify-center gap-1">
            <span>Wins: {profitableCount}</span>
            <span className="text-[10px] opacity-75">(&ge;2 req)</span>
          </div>
          <div className="text-[10px] mt-0.5 font-medium">
            {profitMet ? '✓ Satisfied' : 'Waiting'}
          </div>
        </div>

        {/* Cond 3: Net Profit > 0 */}
        <div className={`p-2 rounded border ${
          netPositive ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-neutral-950 border-neutral-800/80 text-neutral-400'
        }`}>
          <div className="text-[10px] uppercase font-mono tracking-wider mb-0.5">Condition 3</div>
          <div className="font-mono text-xs font-semibold flex items-center justify-center gap-1">
            <span>Net: ${netProfit.toFixed(2)}</span>
          </div>
          <div className="text-[10px] mt-0.5 font-medium">
            {netPositive ? '✓ Positive' : 'Below $0'}
          </div>
        </div>
      </div>

      {/* Explanatory Footer */}
      <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
        <span className="truncate">
          {totalPositions === 0
            ? 'No open MT5 tickets in monitoring pool.'
            : isRuleSatisfied
            ? 'All 3 conditions met: Bot will automatically liquidate the balanced batch.'
            : 'Evaluating open batch tickets on every 30s evaluation pass.'}
        </span>
        <span className="font-mono text-neutral-500 shrink-0 ml-2">Magic: 998877</span>
      </div>
    </div>
  );
};
