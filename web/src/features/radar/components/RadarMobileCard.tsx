"use client";

import React from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { ReplayStock } from "@/lib/api";

interface Props {
  stock: ReplayStock;
  index: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

export const RadarMobileCard: React.FC<Props> = ({
  stock,
  index,
  isSelected,
  onSelect,
}) => {
  const price = stock.price || 0;
  const move = stock.move_pct || 0;
  const vwapDist = stock.vwap_dist_pct || 0;
  const rvol = stock.rvol || 0;
  const isAbove = stock.is_above_vwap;

  const isLong = isAbove && move >= 0;
  const isShort = !isAbove && move < 0;
  const isSurge = rvol >= 3.0;

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className={`p-3.5 border-b border-surface-border transition-colors flex flex-col gap-2 select-none active:bg-surface-hover ${
        isSelected ? "bg-surface-hover/80 border-l-2 border-l-foreground" : "bg-surface"
      }`}
    >
      {/* Top Row: Symbol + Badges + Day Move */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground/30 text-[11px] font-medium w-4">
            #{index + 1}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAbove ? "bg-foreground" : "bg-surface-border"
            }`}
          />
          <span className="font-bold text-foreground text-sm tracking-wide">
            {stock.symbol}
          </span>
          <span className="text-[11px] text-foreground/50">{stock.sector}</span>
        </div>

        {/* Change % */}
        <div className="text-right">
          <span
            className={`text-sm font-bold ${
              move > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : move < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {move >= 0 ? "+" : ""}
            {move.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bottom Row: Price, RVOL, VWAP, AI Action & Quick Chart */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <div className="flex items-center gap-2.5">
          <span className="font-medium text-foreground">₹{price.toFixed(2)}</span>
          <span className="text-foreground/20">•</span>
          <span
            className={`text-[11px] font-bold ${
              rvol >= 3.0 ? "text-foreground font-black" : "text-foreground/60"
            }`}
          >
            {rvol.toFixed(1)}x RVOL
          </span>
          <span className="text-foreground/20">•</span>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              isAbove
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isAbove ? "+" : "-"}
            {Math.abs(vwapDist).toFixed(1)}% VWAP
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Action Badge (Single-Word: LONG, SHORT, WAIT) */}
          {isLong ? (
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-foreground text-background tracking-wider">
              LONG
            </span>
          ) : isShort ? (
            <span className="text-[9px] font-black px-2 py-0.5 rounded border border-foreground/40 text-foreground tracking-wider">
              SHORT
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-muted text-foreground/40 border border-surface-border tracking-wider">
              WAIT
            </span>
          )}

          {/* Quick Chart Link */}
          <Link
            href={`/chart?symbol=${encodeURIComponent(stock.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-surface-muted hover:bg-foreground hover:text-background text-foreground/60 transition"
            title="Open Chart"
          >
            <LineChart className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
