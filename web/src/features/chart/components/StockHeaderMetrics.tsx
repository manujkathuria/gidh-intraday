"use client";

import React from "react";
import { formatMinutesToTime } from "@/stores/replayStore";
import { ReplayStock } from "@/lib/api";

interface Props {
  activeSymbol: string;
  stockInfo?: ReplayStock;
  currentTimeMinutes: number;
  candlesCount: number;
  lastClosePrice: number;
  lastVwap: number;
}

export const StockHeaderMetrics: React.FC<Props> = ({
  activeSymbol,
  stockInfo,
  currentTimeMinutes,
  candlesCount,
  lastClosePrice,
  lastVwap,
}) => {
  const price = stockInfo?.price || lastClosePrice;
  const movePct = stockInfo?.move_pct || 0;
  const vwap = stockInfo?.vwap || lastVwap;
  const rvol = stockInfo?.rvol || 0;
  const clv = stockInfo?.clv || 0;
  const isAboveVwap = stockInfo?.is_above_vwap ?? price >= vwap;

  return (
    <div className="bg-surface border border-surface-border rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Symbol & Sector Info */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-foreground">
              {activeSymbol}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
              {stockInfo?.sector || "EQUITY"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-foreground/50 mt-0.5">
            <span>As of {formatMinutesToTime(currentTimeMinutes).slice(0, 5)} IST</span>
            <span>•</span>
            <span>{candlesCount} 1m Bars Loaded</span>
          </div>
        </div>
      </div>

      {/* Live Metrics Matrix (Monochrome) */}
      <div className="flex items-center gap-4 font-mono text-xs">
        {/* LTP */}
        <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
          <span className="text-[10px] text-foreground/40 font-bold">LTP</span>
          <span className="text-sm font-black text-foreground">
            ₹{price.toFixed(2)}
          </span>
        </div>

        {/* Change */}
        <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
          <span className="text-[10px] text-foreground/40 font-bold">CHANGE</span>
          <span className="text-sm font-black text-foreground">
            {movePct >= 0 ? "+" : ""}
            {movePct.toFixed(2)}%
          </span>
        </div>

        {/* VWAP */}
        <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
          <span className="text-[10px] text-foreground/40 font-bold">VWAP</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-foreground">
              ₹{vwap.toFixed(2)}
            </span>
            <span className="px-1 py-0.2 rounded text-[9px] font-bold border border-surface-border bg-surface text-foreground/70">
              {isAboveVwap ? "BULL" : "BEAR"}
            </span>
          </div>
        </div>

        {/* RVOL */}
        <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
          <span className="text-[10px] text-foreground/40 font-bold">RVOL PACE</span>
          <span className="text-sm font-black text-foreground">
            {rvol.toFixed(2)}x
          </span>
        </div>

        {/* CLV */}
        <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
          <span className="text-[10px] text-foreground/40 font-bold">CLV (0-1)</span>
          <span className="text-sm font-black text-foreground">
            {clv.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
