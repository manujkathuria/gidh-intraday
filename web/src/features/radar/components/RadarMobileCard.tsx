"use client";

import React from "react";
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

  const pts = (100 + move !== 0) ? (price * move) / (100 + move) : 0;

  const pdh = stock.pdh || 0;
  const pdl = stock.pdl || 0;
  const isAbovePdh = pdh > 0 && price > pdh;
  const isBelowPdl = pdl > 0 && price < pdl;
  const pdhDistPct = pdh > 0 ? ((price - pdh) / pdh) * 100 : 0;
  const pdlDistPct = pdl > 0 ? ((price - pdl) / pdl) * 100 : 0;

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className={`p-3 border-b border-surface-border transition-colors flex flex-col gap-1.5 select-none active:bg-surface-hover ${
        isSelected ? "bg-surface-hover/80 border-l-2 border-l-foreground" : "bg-surface"
      }`}
    >
      {/* Top Row: Symbol + Price & Change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground/30 text-[11px] font-medium w-4">
            #{index + 1}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAbove ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span className="font-bold text-foreground text-sm tracking-wide">
            {stock.symbol}
          </span>
        </div>

        {/* Change % and Pts */}
        <div className="text-right flex items-center gap-2">
          <span
            className={`text-xs font-semibold ${
              pts > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : pts < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {pts >= 0 ? "+" : ""}
            {pts.toFixed(2)} pts
          </span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              move > 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : move < 0
                ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                : "text-foreground/60 bg-surface-muted"
            }`}
          >
            {move >= 0 ? "+" : ""}
            {move.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bottom Row: Price, RVOL, VWAP Distance & PD Context */}
      <div className="flex items-center justify-between text-xs pt-0.5 text-foreground/60">
        <span className="font-semibold text-foreground">
          ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-bold ${
              rvol >= 3.0 ? "text-foreground font-black" : "text-foreground/70"
            }`}
          >
            {rvol.toFixed(1)}x
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
          {isAbovePdh && (
            <>
              <span className="text-foreground/20">•</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                &gt;PDH
              </span>
            </>
          )}
          {isBelowPdl && (
            <>
              <span className="text-foreground/20">•</span>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                &lt;PDL
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
