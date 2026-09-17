"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { FuturesInflowItem } from "@/lib/api";
import { getBuildUpStance } from "../types";

interface Props {
  row: FuturesInflowItem;
  index: number;
}

export const FuturesMobileCard: React.FC<Props> = ({ row, index }) => {
  const router = useRouter();
  const pricePct = row.price_1d_pct || 0;
  const oiPct = row.oi_1d_pct || 0;
  const inflow1d = row.fresh_inflow_1d_cr || 0;
  const inflow3d = row.fresh_inflow_3d_cr || 0;
  const stance = getBuildUpStance(pricePct, oiPct);

  return (
    <div
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
      className="p-3 bg-surface hover:bg-surface-hover/50 transition-colors cursor-pointer flex flex-col gap-2 select-none border-b border-surface-border last:border-b-0"
    >
      {/* Top Row: Symbol + Stance + CMP + 1D % */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-foreground/30 text-[10px] font-mono w-4">
            #{index + 1}
          </span>
          <span className="font-bold text-foreground text-sm tracking-wide truncate">
            {row.symbol}
          </span>
          <span
            className={`inline-flex items-center whitespace-nowrap px-1.5 py-0.5 leading-none rounded text-[10px] border tracking-wider shrink-0 ${stance.badgeClass}`}
          >
            {stance.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-right font-mono">
          <span className="text-xs font-semibold text-foreground">
            ₹{row.fut_close.toFixed(1)}
          </span>
          <span
            className={`text-[11px] font-bold ${
              pricePct > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : pricePct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {pricePct >= 0 ? "+" : ""}{pricePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Middle Grid: 1D Inflow | 3D Inflow | 1D OI % (Subtle Monochrome) */}
      <div className="grid grid-cols-3 gap-1.5 bg-surface-muted/30 p-2 rounded-md border border-surface-border/50 text-[11px] font-mono">
        <div className="flex flex-col">
          <span className="text-[9px] text-foreground/45 uppercase tracking-wider">1D Inflow</span>
          <span className="font-semibold text-foreground">
            {inflow1d >= 0 ? "+" : ""}₹{inflow1d.toFixed(1)} Cr
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] text-foreground/45 uppercase tracking-wider">3D Inflow</span>
          <span className="text-foreground/70">
            {inflow3d !== 0 ? `₹${inflow3d.toFixed(1)} Cr` : "-"}
          </span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[9px] text-foreground/45 uppercase tracking-wider">1D OI Δ</span>
          <span className="text-foreground/70">
            {oiPct >= 0 ? "+" : ""}{oiPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bottom Footer: Total Notional + Chart Action */}
      <div className="flex items-center justify-between text-[10px] text-foreground/40 pt-0.5">
        <span className="font-mono">
          Notional: ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
        </span>
        <div className="flex items-center gap-1 text-foreground/60 font-medium">
          <span>Chart</span>
          <ChevronRight className="w-3 h-3 text-foreground/30" />
        </div>
      </div>
    </div>
  );
};
