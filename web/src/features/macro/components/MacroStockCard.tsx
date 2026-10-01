"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { MacroSelectionItem } from "../types";
import { MacroSigmaBar } from "./MacroSigmaBar";

interface Props {
  stock: MacroSelectionItem;
}

export const MacroStockCard: React.FC<Props> = ({ stock }) => {
  const router = useRouter();

  const isShort = stock.side === "SHORT";
  const isPositive = stock.day_change_pct >= 0;

  const getSetupBadge = (type: string) => {
    switch (type) {
      case "PDL_BREAKDOWN":
        return { label: "PDL Breakdown", bg: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
      case "PDH_BREAKOUT":
        return { label: "PDH Breakout", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
      default:
        return { label: type.replace("_", " "), bg: "bg-surface text-foreground/70 border-surface-border" };
    }
  };

  const setupBadge = getSetupBadge(stock.setup_type);

  return (
    <div
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(stock.symbol)}`)}
      className="group relative bg-surface border border-surface-border hover:border-foreground/30 rounded-lg p-3.5 flex flex-col gap-3 transition cursor-pointer hover:shadow-lg select-none"
    >
      {/* Top Header: Rank, Symbol, Sector, RVOL */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono bg-surface-border/60 text-foreground/70 shrink-0">
            #{stock.rank}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm tracking-wide text-foreground group-hover:text-primary transition truncate">
              {stock.symbol}
            </span>
            <span className="text-[10px] text-foreground/50 tracking-wider uppercase font-medium truncate">
              {stock.sector}
            </span>
          </div>
        </div>

        {/* RVOL Badge */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded font-mono font-bold text-xs">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{stock.rvol.toFixed(2)}x RVOL</span>
          </div>
        </div>
      </div>

      {/* Setup Badge & Futures Concurrence Tag */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${setupBadge.bg}`}>
          {setupBadge.label}
        </span>

        {stock.future_close && (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-semibold font-mono">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span>Futures Active (₹{stock.future_close.toFixed(1)})</span>
          </span>
        )}

        <span className="text-[10px] text-foreground/50 font-mono px-1.5 py-0.5 bg-surface-border/30 rounded ml-auto">
          CLV {(stock.clv * 100).toFixed(0)}%
        </span>
      </div>

      {/* Price vs VWAP & PDH/PDL Row */}
      <div className="grid grid-cols-2 gap-2 bg-surface-hover/30 border border-surface-border/40 rounded p-2 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-foreground/50">Live Price</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold text-sm text-foreground">
              ₹{stock.price.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}{stock.day_change_pct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-foreground/50">Prior Day Bounds</span>
          <div className="flex items-center justify-between text-[11px] font-mono text-foreground/70 mt-0.5">
            <span>PDL: ₹{stock.pdl.toFixed(1)}</span>
            <span>PDH: ₹{stock.pdh.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Visual Sigma Spectrum Bar */}
      <MacroSigmaBar stock={stock} />
    </div>
  );
};
