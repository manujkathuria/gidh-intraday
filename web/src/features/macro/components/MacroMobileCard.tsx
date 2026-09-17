"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart } from "lucide-react";

export interface FuturesMacroItem {
  symbol: string;
  trading_symbol: string;
  session_date: string;
  fut_close: number;
  prev_close: number;
  fut_oi: number;
  prev_oi: number;
  total_notional_cr: number;
  price_1d_pct: number;
  oi_1d_pct: number;
  fresh_inflow_1d_cr: number;
  oi_3d_pct: number;
  fresh_inflow_3d_cr: number;
  state?: "ALL" | "LONGS" | "SHORTS" | "UNWINDING" | "COVERING";
}

interface Props {
  row: FuturesMacroItem;
  index: number;
}

export const MacroMobileCard: React.FC<Props> = ({ row, index }) => {
  const router = useRouter();
  const p = row.price_1d_pct || 0;
  const oi = row.oi_1d_pct || 0;
  const inflow = row.fresh_inflow_1d_cr || 0;

  return (
    <div
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
      className="p-3.5 border-b border-surface-border transition-colors flex flex-col gap-2 select-none active:bg-surface-hover/80 bg-surface cursor-pointer"
    >
      {/* 1. Top Row: Index + Dot + Symbol + Price & 1D Move % */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground/30 text-[11px] font-medium w-4 text-center">
            #{index + 1}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              row.state === "LONGS"
                ? "bg-emerald-500"
                : row.state === "SHORTS"
                ? "bg-rose-500"
                : row.state === "UNWINDING"
                ? "bg-amber-500"
                : "bg-surface-border"
            }`}
          />
          <span className="font-bold text-foreground text-sm tracking-wide">
            {row.symbol}
          </span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="font-mono text-xs text-foreground/80">
            ₹{row.fut_close.toFixed(2)}
          </span>
          <span
            className={`font-mono text-xs font-bold ${
              p > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : p < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {p >= 0 ? "+" : ""}
            {p.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2. Middle Row: Inflow, OI Change, and Notional */}
      <div className="flex items-center justify-between text-xs pt-0.5 text-foreground/70 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-foreground/50 text-[11px]">Inflow:</span>
          <span className={`font-bold ${inflow > 0 ? "text-foreground" : "text-foreground/40"}`}>
            {inflow >= 0 ? "+" : ""}₹{inflow.toFixed(1)} Cr
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div>
            <span className="text-foreground/40 mr-1">OI:</span>
            <span className="text-foreground/80 font-medium">
              {oi >= 0 ? "+" : ""}{oi.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-foreground/40 mr-1">Total:</span>
            <span className="text-foreground/80 font-medium">
              ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Stance Badge + Open Chart */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-foreground/40 uppercase tracking-wider font-semibold">
            Stance:
          </span>
          {row.state === "LONGS" ? (
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-foreground text-background tracking-wider">
              LONG
            </span>
          ) : row.state === "SHORTS" ? (
            <span className="text-[9px] font-black px-2 py-0.5 rounded border border-foreground/40 text-foreground tracking-wider">
              SHORT
            </span>
          ) : row.state === "UNWINDING" ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-muted text-amber-500/90 border border-surface-border tracking-wider">
              UNWIND
            </span>
          ) : row.state === "COVERING" ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-muted text-blue-500/90 border border-surface-border tracking-wider">
              COVER
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-muted text-foreground/40 border border-surface-border tracking-wider">
              WAIT
            </span>
          )}
        </div>

        <Link
          href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded bg-surface-muted text-foreground/70 hover:bg-foreground hover:text-background text-[10px] font-semibold transition"
          title={`Open ${row.symbol} Chart`}
        >
          <LineChart className="w-3 h-3" />
          <span>Chart</span>
        </Link>
      </div>
    </div>
  );
};
