"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart } from "lucide-react";
import { FuturesInflowItem } from "@/lib/api";
import { getBuildUpStance } from "../types";

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
  const stance = getBuildUpStance(pricePct, oiPct);

  return (
    <tr
      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
      className="border-b border-surface-border transition-colors cursor-pointer group hover:bg-surface-hover/60 text-xs "
    >
      {/* Index */}
      <td className="py-2.5 px-3.5 text-center text-foreground/30 text-[11px] w-10 whitespace-nowrap hidden sm:table-cell">
        {index + 1}
      </td>

      {/* Symbol */}
      <td className="py-2.5 px-3.5 font-bold text-foreground whitespace-nowrap">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="tracking-wide font-sans">{row.symbol}</span>
            {row.trading_symbol && (
              <span className="text-[10px] text-foreground/40  hidden lg:inline">
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

      {/* Stance Badge */}
      <td className="py-2.5 px-3.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-[10px] border tracking-wider shrink-0 leading-none ${stance.badgeClass}`}
        >
          {stance.label}
        </span>
      </td>

      {/* CMP Price */}
      <td className="py-2.5 px-3.5 text-right text-foreground whitespace-nowrap">
        ₹{row.fut_close.toFixed(2)}
      </td>

      {/* 1D Price % */}
      <td className="py-2.5 px-3.5 text-right font-bold whitespace-nowrap">
        <span
          className={
            pricePct > 0
              ? "text-emerald-600 dark:text-emerald-400 font-bold"
              : pricePct < 0
                ? "text-rose-600 dark:text-rose-400 font-bold"
                : "text-foreground/60"
          }
        >
          {pricePct >= 0 ? "+" : ""}
          {pricePct.toFixed(2)}%
        </span>
      </td>

      {/* 1D OI % */}
      <td className="py-2.5 px-3.5 text-right text-foreground/80 whitespace-nowrap">
        {oiPct >= 0 ? "+" : ""}
        {oiPct.toFixed(1)}%
      </td>

      {/* 1D Inflow (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right font-semibold text-foreground whitespace-nowrap">
        {inflow1d >= 0 ? "+" : ""}₹{inflow1d.toFixed(1)} Cr
      </td>

      {/* 3D Inflow (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right text-foreground/60 whitespace-nowrap hidden sm:table-cell">
        {inflow3d !== 0 ? `₹${inflow3d.toFixed(1)} Cr` : "-"}
      </td>

      {/* Total Notional (₹ Cr) */}
      <td className="py-2.5 px-3.5 text-right text-foreground/40 whitespace-nowrap hidden md:table-cell">
        ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
      </td>
    </tr>
  );
};
