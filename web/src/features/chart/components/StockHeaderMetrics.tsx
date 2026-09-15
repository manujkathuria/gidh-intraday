"use client";

import React from "react";
import { ReplayStock } from "@/lib/api";
import { StockSearchCombobox } from "./StockSearchCombobox";
import { ChartIntervalSelector } from "./ChartIntervalSelector";
import { StockSummaryItem } from "../types";
import { ChartInterval } from "./candleAggregator";

interface Props {
  activeSymbol: string;
  stockInfo?: ReplayStock;
  currentTimeMinutes: number;
  candlesCount: number;
  lastClosePrice: number;
  lastVwap: number;
  allSymbols?: StockSummaryItem[];
  onSelectSymbol?: (sym: string) => void;
  interval?: ChartInterval;
  onChangeInterval?: (interval: ChartInterval) => void;
  mode?: "LIVE" | "REPLAY";
}

export const StockHeaderMetrics: React.FC<Props> = ({
  activeSymbol,
  stockInfo,
  lastClosePrice,
  allSymbols = [],
  onSelectSymbol,
  interval = "5m",
  onChangeInterval,
  mode = "LIVE",
}) => {
  const price = stockInfo?.price || lastClosePrice;
  const movePct = stockInfo?.move_pct || 0;
  const rvol = stockInfo?.rvol || 0;

  return (
    <div className="h-10 px-3 bg-surface border border-surface-border rounded-lg flex items-center justify-between gap-3 select-none text-xs shrink-0">
      {/* Left: Stock Selector + Sector */}
      <div className="flex items-center gap-2 min-w-0">
        {onSelectSymbol ? (
          <StockSearchCombobox
            allSymbols={allSymbols}
            activeSymbol={activeSymbol}
            onSelectSymbol={onSelectSymbol}
          />
        ) : (
          <span className="font-black text-sm text-foreground uppercase tracking-tight">
            {activeSymbol}
          </span>
        )}

        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-foreground/70 font-semibold border border-surface-border">
          {stockInfo?.sector || "EQUITY"}
        </span>
      </div>

      {/* Center: Interval Selector */}
      {onChangeInterval && (
        <div className="flex items-center justify-center">
          <ChartIntervalSelector
            interval={interval}
            onChangeInterval={onChangeInterval}
            mode={mode}
          />
        </div>
      )}

      {/* Right: Inline Ticker Strip (LTP + RVOL only) */}
      <div className="flex items-center gap-3.5 text-xs overflow-x-auto no-scrollbar">
        {/* LTP & % Change */}
        <div className="flex items-center gap-1.5 tabular-nums">
          <span className="font-black text-foreground text-sm">
            ₹{price.toFixed(2)}
          </span>
          <span
            className={`font-bold text-xs ${
              movePct > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : movePct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {movePct >= 0 ? "+" : ""}
            {movePct.toFixed(2)}%
          </span>
        </div>

        <span className="text-foreground/20 hidden md:inline">•</span>

        {/* RVOL */}
        <div className="hidden md:flex items-center gap-1 tabular-nums">
          <span className="text-foreground/40 text-[10px] font-bold tracking-wider">RVOL</span>
          <span className="font-bold text-foreground">{rvol.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};
