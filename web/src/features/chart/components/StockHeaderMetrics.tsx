"use client";

import React from "react";
import { ReplayStock } from "@/lib/api";
import { ChartIntervalSelector } from "./ChartIntervalSelector";
import { ChartTradeButtons } from "./ChartTradeButtons";
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
  // Modal toggle
  onOpenOrderModal?: (side: "LONG" | "SHORT") => void;
  isOrderModalOpen?: boolean;
  activeOrderSide?: "LONG" | "SHORT";
}

export const StockHeaderMetrics: React.FC<Props> = ({
  activeSymbol,
  stockInfo,
  lastClosePrice,
  lastVwap = 0,
  allSymbols = [],
  onSelectSymbol,
  interval = "5m",
  onChangeInterval,
  onOpenOrderModal,
  isOrderModalOpen,
  activeOrderSide,
}) => {
  const price = stockInfo?.price || lastClosePrice;
  const movePct = stockInfo?.move_pct || 0;
  const rvol = stockInfo?.rvol || 0;

  const vwapDist = stockInfo?.vwap_dist_pct ?? (price && lastVwap ? ((price - lastVwap) / lastVwap) * 100 : 0);

  return (
    <div className="h-10 px-3 bg-surface border border-surface-border rounded-lg flex items-center justify-between gap-3 select-none text-xs shrink-0">
      {/* Left: Integrated Interval Selector & Quick LONG / SHRT buttons */}
      <div className="flex items-center gap-3 min-w-0">
        {onChangeInterval && (
          <div className="flex items-center">
            <ChartIntervalSelector
              interval={interval}
              onChangeInterval={onChangeInterval}
            />
          </div>
        )}

        {/* Vertical Separator & Trade Buttons */}
        {onOpenOrderModal && (
          <>
            <div className="h-4 w-[1px] bg-surface-border" />
            <ChartTradeButtons
              symbol={activeSymbol}
              onOpenOrderModal={onOpenOrderModal}
              isOrderModalOpen={isOrderModalOpen}
              activeOrderSide={activeOrderSide}
            />
          </>
        )}
      </div>

      {/* Right: Unified Streamlined Metrics (LTP, Move %, RVOL, VWAP) */}
      <div className="flex items-center gap-2.5 text-xs shrink-0 tabular-nums">
        {/* LTP */}
        <span className="font-black text-sm text-foreground">
          ₹{price.toFixed(2)}
        </span>

        {/* Change % Badge */}
        <span
          className={`font-bold text-xs px-2 py-0.5 rounded-md ${
            movePct > 0
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : movePct < 0
              ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
              : "text-foreground/60 bg-surface-muted"
          }`}
        >
          {movePct >= 0 ? "+" : ""}
          {movePct.toFixed(2)}%
        </span>

        {/* RVOL Badge */}
        {rvol > 0 && (
          <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-surface-border text-foreground/70">
            <span className="text-foreground/40 font-medium text-[10px]">RVOL</span>
            <span className="text-foreground font-black">{rvol.toFixed(1)}x</span>
          </span>
        )}

        {/* VWAP Distance */}
        {vwapDist !== 0 && (
          <span className="hidden lg:inline-flex items-center text-xs font-semibold text-foreground/50">
            {vwapDist >= 0 ? "+" : ""}{vwapDist.toFixed(1)}% VWAP
          </span>
        )}
      </div>
    </div>
  );
};
