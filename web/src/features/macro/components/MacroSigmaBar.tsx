"use client";

import React from "react";
import { MacroSelectionItem } from "../types";

interface Props {
  stock: MacroSelectionItem;
}

export const MacroSigmaBar: React.FC<Props> = ({ stock }) => {
  const { price, vwap, vwap_plus_1s, vwap_plus_2s, vwap_minus_1s, vwap_minus_2s, side } = stock;

  const minRange = vwap_minus_2s;
  const maxRange = vwap_plus_2s;
  const totalSpan = maxRange - minRange;

  // Calculate percentage along the scale (clamped 0 - 100)
  const pricePct = totalSpan > 0 ? Math.max(0, Math.min(100, ((price - minRange) / totalSpan) * 100)) : 50;
  const vwapPct = totalSpan > 0 ? Math.max(0, Math.min(100, ((vwap - minRange) / totalSpan) * 100)) : 50;

  const distTo2s = Math.abs(vwap_plus_2s - price);
  const distTo2sPct = ((distTo2s / price) * 100).toFixed(2);

  return (
    <div className="flex flex-col gap-1.5 w-full bg-surface/60 border border-surface-border/50 rounded p-2 text-xs">
      {/* Target Level Callout */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-foreground/60 font-medium">
          {side === "SHORT" ? "🎯 Target Sell (+2σ):" : "🎯 Target Buy (-2σ):"}
        </span>
        <span className="font-mono font-bold text-foreground">
          ₹{side === "SHORT" ? vwap_plus_2s.toFixed(2) : vwap_minus_2s.toFixed(2)}{" "}
          <span className="text-foreground/50 font-normal text-[10px]">
            ({distTo2sPct}% away)
          </span>
        </span>
      </div>

      {/* Visual Spectrum Bar */}
      <div className="relative w-full h-2 bg-surface-border/60 rounded-full overflow-hidden my-1">
        {/* Lower Zone (Oversold) */}
        <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-emerald-500/20" />
        {/* Center VWAP Zone */}
        <div className="absolute left-1/4 top-0 bottom-0 w-1/2 bg-surface/80" />
        {/* Upper Zone (Overbought / Trap Peak) */}
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-rose-500/20" />

        {/* VWAP Center Tick */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
          style={{ left: `${vwapPct}%` }}
        />

        {/* Current Price Pin */}
        <div
          className={`absolute top-0 bottom-0 w-2 h-2 rounded-full border border-background shadow-md z-20 -translate-x-1/2 ${
            side === "SHORT" ? "bg-rose-500" : "bg-emerald-500"
          }`}
          style={{ left: `${pricePct}%` }}
        />
      </div>

      {/* Grid Labels */}
      <div className="flex justify-between items-center text-[10px] font-mono text-foreground/50">
        <span>-2σ ₹{vwap_minus_2s.toFixed(1)}</span>
        <span>VWAP ₹{vwap.toFixed(1)}</span>
        <span>+2σ ₹{vwap_plus_2s.toFixed(1)}</span>
      </div>
    </div>
  );
};
