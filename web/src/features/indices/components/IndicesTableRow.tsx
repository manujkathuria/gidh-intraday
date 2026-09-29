"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart } from "lucide-react";
import { IndexItem } from "@/lib/types_market";

interface Props {
  row: IndexItem;
  index: number;
}

export const IndicesTableRow: React.FC<Props> = ({ row, index }) => {
  const router = useRouter();
  const price = row.spot_price || 0;
  const move = row.change_pct || 0;
  const pts = row.change_pts || 0;
  const isPos = move >= 0;

  const isChartable =
    row.symbol === "NIFTY 50" || row.symbol === "NIFTY BANK" || row.symbol === "GIFT NIFTY";

  const handleRowClick = () => {
    if (isChartable) {
      router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`border-b border-surface-border transition-colors group text-xs ${
        isChartable ? "cursor-pointer hover:bg-surface-hover/60" : "hover:bg-surface-hover/40"
      }`}
    >
      {/* 1. Rank # */}
      <td className="py-2.5 px-3.5 text-center text-foreground/30 text-[11px] hidden sm:table-cell">
        {index + 1}
      </td>

      {/* 2. Symbol */}
      <td className="py-2.5 px-3.5 font-bold text-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isPos ? "bg-foreground" : "bg-surface-border"
              }`}
            />
            <span className="text-xs tracking-wider font-sans font-bold">{row.symbol}</span>
          </div>

          {isChartable && (
            <Link
              href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
              title={`Open ${row.symbol} Chart`}
            >
              <LineChart className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </td>

      {/* 3. Type / Category */}
      <td className="py-2.5 px-3.5 text-foreground/50 text-[11px] hidden md:table-cell">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider ${
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
      </td>

      {/* 4. Price */}
      <td className="py-2.5 px-3.5 text-right font-mono text-foreground">
        ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
      </td>

      {/* 5. Change (Pts) */}
      <td className="py-2.5 px-3.5 text-right font-mono font-medium hidden sm:table-cell">
        <span
          className={
            pts > 0
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : pts < 0
              ? "text-rose-600 dark:text-rose-400 font-bold"
              : "text-foreground/60"
          }
        >
          {pts >= 0 ? "+" : ""}
          {pts.toFixed(1)}
        </span>
      </td>

      {/* 6. Day Move % with Subdued Tint (matching Radar) */}
      <td className="py-2.5 px-3.5 text-right font-mono font-bold">
        <span
          className={
            move > 0
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : move < 0
              ? "text-rose-600 dark:text-rose-400 font-bold"
              : "text-foreground/60"
          }
        >
          {move >= 0 ? "+" : ""}
          {move.toFixed(2)}%
        </span>
      </td>

      {/* 7. Action Badge / Status */}
      <td className="py-2.5 px-3.5 text-center">
        {isChartable ? (
          <Link
            href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-surface-border hover:bg-foreground hover:text-background text-foreground/70 transition"
          >
            <LineChart className="w-3 h-3" />
            <span>CHART</span>
          </Link>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-muted text-foreground/30 border border-surface-border">
            PULSE
          </span>
        )}
      </td>
    </tr>
  );
};
