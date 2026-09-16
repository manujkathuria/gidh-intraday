"use client";

import React from "react";
import Link from "next/link";
import { XCircle, LineChart } from "lucide-react";
import { ActivePosition } from "@/lib/api";

interface Props {
  pos: ActivePosition;
  slotIndex: number;
  onSquareOff: (symbol: string) => void;
}

export const ActivePositionCard: React.FC<Props> = ({
  pos,
  slotIndex,
  onSquareOff,
}) => {
  const isLong = pos.side === "LONG" || pos.side === "BUY";
  const isProfit = pos.pnl_inr > 0;
  const isLoss = pos.pnl_inr < 0;


  let stopBadge = "SL -1.50% (HARD)";
  let stopBadgeStyle = "bg-surface-muted text-foreground/80 border-surface-border";
  if (pos.stop_floor_pct >= 2.5) {
    stopBadge = "🔒 +2.50% LOCKED";
    stopBadgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (pos.stop_floor_pct >= 1.0) {
    stopBadge = "🔒 +1.00% LOCKED";
    stopBadgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (pos.stop_floor_pct >= 0.0) {
    stopBadge = "🛡️ 0.00% BREAKEVEN";
    stopBadgeStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }

  return (
    <div
      className={`bg-surface border-2 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm relative overflow-hidden transition-colors ${
        isProfit
          ? "border-emerald-500/25 bg-emerald-500/[0.02]"
          : isLoss
          ? "border-rose-500/25 bg-rose-500/[0.02]"
          : "border-surface-border"
      }`}
    >
      {/* Slot Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/60">
            Slot {slotIndex + 1}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded border ${
              isLong
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            {pos.side}
          </span>
        </div>

        <button
          onClick={() => {
            if (confirm(`Square off ${pos.symbol} at market immediately?`)) {
              onSquareOff(pos.symbol);
            }
          }}
          title="Square off position unconditionally"
          className="p-1 rounded text-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Stock Symbol & Tactic */}
      <div>
        <h3 className="text-xl font-black text-foreground tracking-tight">
          {pos.symbol}
        </h3>
        <span className="text-[10px] text-foreground/50">
          {pos.tactic || "15M VWAP PLAY"}
        </span>
      </div>

      {/* Pricing Details */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-foreground/60 text-[11px]">
          <span>Quantity:</span>
          <span className="font-bold text-foreground">{pos.quantity} Qty</span>
        </div>
        <div className="flex justify-between text-foreground/60 text-[11px]">
          <span>Avg Entry:</span>
          <span className="font-bold text-foreground">
            ₹{pos.entry_price.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-foreground/60 text-[11px]">
          <span>Live LTP:</span>
          <span className="font-black text-foreground">
            ₹{pos.current_ltp.toFixed(2)}
          </span>
        </div>
      </div>

      {/* P&L Block */}
      <div className="pt-2 border-t border-surface-border flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-foreground/50 uppercase font-bold">
            P&L
          </span>
          <div
            className={`text-sm font-black tabular-nums ${
              isProfit
                ? "text-emerald-600 dark:text-emerald-400"
                : isLoss
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)} (
            {isProfit ? "+" : ""}
            {pos.pnl_pct.toFixed(2)}%)
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-foreground/50">
          <span>MFE Peak:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            +{pos.mfe_pct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Trailing Stop Badge */}
      <div className={`text-[9px] text-center font-bold px-2 py-1 rounded border ${stopBadgeStyle}`}>
        {stopBadge}
      </div>

      {/* Bottom Actions */}
      <div className="pt-2 border-t border-surface-border flex items-center justify-between">
        <Link
          href={`/chart?symbol=${encodeURIComponent(pos.symbol)}`}
          className="text-[11px] text-foreground/70 hover:text-foreground flex items-center gap-1 font-bold transition"
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Chart</span>
        </Link>

        <button
          onClick={() => onSquareOff(pos.symbol)}
          className="text-[10px] font-bold px-2 py-0.5 rounded border border-surface-border text-foreground hover:bg-surface-hover transition"
        >
          Square Off
        </button>
      </div>
    </div>
  );
};
