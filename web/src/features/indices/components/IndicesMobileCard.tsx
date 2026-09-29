"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, LineChart } from "lucide-react";
import { IndexItem } from "@/lib/types_market";

interface Props {
  row: IndexItem;
}

export const IndicesMobileCard: React.FC<Props> = ({ row }) => {
  const isPos = row.change_pct >= 0;
  const isChartable =
    row.symbol === "NIFTY 50" || row.symbol === "NIFTY BANK" || row.symbol === "GIFT NIFTY";

  return (
    <div className="p-3 rounded-lg bg-surface border border-surface-border flex items-center justify-between gap-3 text-xs shadow-xs">
      {/* Left: Symbol & Category */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-foreground text-sm tracking-wide truncate">{row.symbol}</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border tracking-wider shrink-0 ${
              row.category === "BENCHMARK"
                ? "bg-foreground text-background border-foreground"
                : row.category === "GLOBAL_CUE"
                  ? "bg-surface-muted text-blue-600 dark:text-blue-400 border-surface-border"
                  : row.category === "VOLATILITY"
                    ? "bg-surface-muted text-amber-600 dark:text-amber-400 border-surface-border"
                    : "bg-surface text-foreground/70 border-surface-border"
            }`}
          >
            {row.category || "SECTOR"}
          </span>
        </div>
        {row.name && row.name !== row.symbol && (
          <span className="text-[10px] text-foreground/40 truncate">{row.name}</span>
        )}
      </div>

      {/* Right: Price & Combined Change (Pts & %) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-sm font-mono font-bold text-foreground">
            ₹{row.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-end gap-1 font-mono font-semibold text-[11px]">
            {isPos ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            )}
            <span className={isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
              {isPos ? "+" : ""}{row.change_pts ? row.change_pts.toFixed(1) : "0.0"} ({isPos ? "+" : ""}{row.change_pct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {isChartable && (
          <Link
            href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
            className="p-1.5 rounded bg-surface-muted hover:bg-foreground hover:text-background text-foreground/60 transition"
            title="Open Chart"
          >
            <LineChart className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
