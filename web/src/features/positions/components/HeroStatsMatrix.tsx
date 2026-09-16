"use client";

import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface Props {
  totalPnLINR: number;
  usedSlots: number;
  totalMarginUsed: number;
  totalCapitalPool: number;
  availableSlots: number;
  totalGrossExposure: number;
  isConnected: boolean;
  onRefresh: () => void;
}

export const HeroStatsMatrix: React.FC<Props> = ({
  totalPnLINR,
  usedSlots,
  totalMarginUsed,
  totalCapitalPool,
  availableSlots,
  totalGrossExposure,
  isConnected,
  onRefresh,
}) => {
  const pnlPct = usedSlots > 0 ? (totalPnLINR / (usedSlots * 10000)) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
      {/* 1. Total Real-Time P&L */}
      <div
        className={`bg-surface border rounded-xl p-4 flex flex-col justify-between shadow-sm transition-colors ${
          totalPnLINR > 0
            ? "border-emerald-500/25 bg-emerald-500/[0.02]"
            : totalPnLINR < 0
            ? "border-rose-500/25 bg-rose-500/[0.02]"
            : "border-surface-border"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground/50 uppercase tracking-wider text-[11px]">
            Total Live P&L
          </span>
          <span
            className={`p-1.5 rounded-md border ${
              totalPnLINR > 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : totalPnLINR < 0
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-surface-muted text-foreground/70 border-surface-border"
            }`}
          >
            {totalPnLINR >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tabular-nums ${
              totalPnLINR > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : totalPnLINR < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {totalPnLINR >= 0 ? "+" : ""}₹{totalPnLINR.toFixed(2)}
          </span>
          <span
            className={`text-xs font-bold tabular-nums ${
              totalPnLINR > 0
                ? "text-emerald-600/75 dark:text-emerald-400/75"
                : totalPnLINR < 0
                ? "text-rose-600/75 dark:text-rose-400/75"
                : "text-foreground/50"
            }`}
          >
            ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-surface-border flex justify-between text-[11px] text-foreground/50">
          <span>Real-Time MTM</span>
          <span className="font-bold text-foreground">{usedSlots} Active Slots</span>
        </div>
      </div>

      {/* 2. Capital & Margin Pool */}
      <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground/50 uppercase tracking-wider text-[11px]">
            Margin Utilization
          </span>
          <span className="font-bold px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground">
            {usedSlots} / 5 Slots
          </span>
        </div>
        <div className="mt-2 text-2xl font-black text-foreground">
          ₹{totalMarginUsed.toLocaleString("en-IN")}{" "}
          <span className="text-sm font-normal text-foreground/40">/ ₹{totalCapitalPool.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-surface-border flex flex-col gap-1">
          <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
            <div className="bg-foreground h-full rounded-full transition-all" style={{ width: `${(usedSlots / 5) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-foreground/50">
            <span>₹10,000 / Slot</span>
            <span>{availableSlots} Available</span>
          </div>
        </div>
      </div>

      {/* 3. Leverage & Gross Power */}
      <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground/50 uppercase tracking-wider text-[11px]">
            Gross MIS Exposure
          </span>
          <span className="font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/80">
            5x LEVERAGE
          </span>
        </div>
        <div className="mt-2 text-2xl font-black text-foreground">
          ₹{totalGrossExposure.toLocaleString("en-IN")}{" "}
          <span className="text-sm font-normal text-foreground/40">/ ₹2,50,000 Max</span>
        </div>
        <div className="mt-2 pt-2 border-t border-surface-border flex justify-between text-[11px] text-foreground/50">
          <span>Risk Floor</span>
          <span className="font-bold text-foreground">-₹750 SL (-1.5%)</span>
        </div>
      </div>

      {/* 4. Live Execution & Broker Sync */}
      <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground/50 uppercase tracking-wider text-[11px]">
            Broker & Stream
          </span>
          <button onClick={onRefresh} className="p-1 rounded hover:bg-surface-hover text-foreground/50 hover:text-foreground transition" title="Force Re-sync">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-foreground" />
          </span>
          <span className="text-base font-black text-foreground">{isConnected ? "ZERODHA CONNECTED" : "OFFLINE"}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-surface-border flex justify-between text-[11px] text-foreground/50">
          <span>Market Protection</span>
          <span className="font-bold text-foreground">-1 (Zero Collar)</span>
        </div>
      </div>
    </div>
  );
};
