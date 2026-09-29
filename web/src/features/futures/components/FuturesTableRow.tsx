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

export const FuturesTableRow: React.FC<Props> = ({ row, index }) => {
  const router = useRouter();
  const pricePct = row.price_1d_pct || 0;
  const oiPct = row.oi_1d_pct || 0;
  const inflow1d = row.fresh_inflow_1d_cr || 0;
  const inflow3d = row.fresh_inflow_3d_cr || 0;

  return (
    <tr
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
      className="border-b border-surface-border transition-colors cursor-pointer group hover:bg-surface-hover/60 text-xs"
    >
      {/* Index */}
      <td className="py-2.5 px-3.5 text-center text-foreground/30 text-[11px] w-10 whitespace-nowrap hidden sm:table-cell">
        {index + 1}
      </td>

      {/* Symbol & Contract */}
      <td className="py-2.5 px-3.5 font-bold text-foreground whitespace-nowrap">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="tracking-wide font-sans">{row.symbol}</span>
            {row.trading_symbol && (
              <span className="text-[10px] text-foreground/40 hidden lg:inline font-mono">
                {row.trading_symbol}
              </span>
            )}
          </div>
          <Link
            href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100"
            title={`Open ${row.symbol} Chart`}
          >
            <LineChart className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>

      {/* Price (CMP) */}
      <td className="py-2.5 px-3.5 text-right font-mono text-foreground whitespace-nowrap">
        ₹{row.fut_close.toFixed(2)}
      </td>

      {/* 1D Price Change % */}
      <td className="py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap">
        <span
          className={
            pricePct > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : pricePct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
          }
        >
          {pricePct >= 0 ? "+" : ""}
          {pricePct.toFixed(2)}%
        </span>
      </td>

      {/* Open Interest (Contracts / Units) */}
      <td className="py-2.5 px-3.5 text-right font-mono text-foreground/80 whitespace-nowrap">
        {row.fut_oi ? Number(row.fut_oi).toLocaleString("en-IN") : "-"}
      </td>

      {/* 1D OI Change % */}
      <td className="py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap">
        <span
          className={
            oiPct > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : oiPct < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
          }
        >
          {oiPct >= 0 ? "+" : ""}
          {oiPct.toFixed(1)}%
        </span>
      </td>

      {/* 1D Rupee Inflow (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
        <span className={inflow1d !== 0 ? (inflow1d > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400") : "text-foreground/60"}>
          {inflow1d >= 0 ? "+" : ""}₹{inflow1d.toFixed(1)} Cr
        </span>
      </td>

      {/* 3D Rupee Inflow (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right font-mono text-foreground/60 whitespace-nowrap hidden sm:table-cell">
        {inflow3d !== 0 ? `₹${inflow3d.toFixed(1)} Cr` : "-"}
      </td>

      {/* Total Notional (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right font-mono text-foreground/50 whitespace-nowrap hidden md:table-cell">
        ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
      </td>
    </tr>
  );
};
