"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart } from "lucide-react";
import { FuturesInflowItem } from "@/lib/api";

interface Props {
  row: FuturesInflowItem;
  index: number;
}

export const MacroMobileCard: React.FC<Props> = ({ row, index }) => {
  const router = useRouter();
  const p = row.price_1d_pct || 0;
  const oi = row.oi_1d_pct || 0;
  const inflow1d = row.fresh_inflow_1d_cr || 0;
  const inflow3d = row.fresh_inflow_3d_cr || 0;

  return (
    <div
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
      className="p-3.5 border-b border-surface-border transition-colors flex flex-col gap-2.5 select-none active:bg-surface-hover/80 bg-surface cursor-pointer"
    >
      {/* 1. Top Row: Index + Symbol + Price & 1D Move % */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground/30 text-[11px] font-mono w-4 text-center">
            #{index + 1}
          </span>
          <span className="font-bold text-foreground text-sm tracking-wide">
            {row.symbol}
          </span>
          <span className="text-[10px] text-foreground/40 font-mono">
            {row.trading_symbol}
          </span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="font-mono text-xs font-semibold text-foreground">
            ₹{row.fut_close.toFixed(2)}
          </span>
          <span
            className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
              p > 0
                ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10"
                : p < 0
                ? "text-rose-700 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/10"
                : "text-foreground/60 bg-surface-muted"
            }`}
          >
            {p >= 0 ? "+" : ""}
            {p.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2. Middle Row: Inflow (1D & 3D) + OI % */}
      <div className="grid grid-cols-3 gap-2 text-xs bg-surface-muted/30 p-2 rounded border border-surface-border/40 font-mono">
        <div className="flex flex-col">
          <span className="text-foreground/50 text-[10px] uppercase">1D Inflow</span>
          <span className={`font-bold ${inflow1d > 0 ? "text-emerald-600 dark:text-emerald-400" : inflow1d < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground/40"}`}>
            {inflow1d >= 0 ? "+" : ""}₹{inflow1d.toFixed(1)} Cr
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-foreground/50 text-[10px] uppercase">3D Inflow</span>
          <span className="font-semibold text-foreground/80">
            {inflow3d !== 0 ? `₹${inflow3d.toFixed(1)} Cr` : "-"}
          </span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-foreground/50 text-[10px] uppercase">1D OI Change</span>
          <span className={`font-semibold ${oi > 0 ? "text-foreground" : oi < 0 ? "text-foreground/60" : "text-foreground/40"}`}>
            {oi >= 0 ? "+" : ""}{oi.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 3. Bottom Row: Total Notional + Chart Action */}
      <div className="flex items-center justify-between text-xs text-foreground/60">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-foreground/40">Total Notional:</span>
          <span className="font-semibold text-foreground/80">
            ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
          </span>
        </div>

        <Link
          href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-muted text-foreground/80 hover:bg-foreground hover:text-background text-[11px] font-semibold transition border border-surface-border"
          title={`Open ${row.symbol} Chart`}
        >
          <LineChart className="w-3 h-3" />
          <span>Open Chart</span>
        </Link>
      </div>
    </div>
  );
};
