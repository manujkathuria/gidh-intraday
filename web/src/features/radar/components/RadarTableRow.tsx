"use client";

import React from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { ReplayStock } from "@/lib/api";

interface Props {
  stock: ReplayStock;
  index: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

export const RadarTableRow: React.FC<Props> = ({
  stock,
  index,
  isSelected,
  onSelect,
}) => {
  const price = stock.price || 0;
  const move = stock.move_pct || 0;
  const vwapDist = stock.vwap_dist_pct || 0;
  const rvol = stock.rvol || 0;
  const isAbove = stock.is_above_vwap;

  // Determine clean Long / Short AI Action & Stance
  const isLong = isAbove && move >= 0;
  const isShort = !isAbove && move < 0;
  const isSurge = rvol >= 3.0;

  return (
    <tr
      onClick={() => onSelect(stock.symbol)}
      className={`border-b border-surface-border transition-colors cursor-pointer group text-xs ${
        isSelected ? "bg-surface-hover font-semibold border-l-2 border-l-foreground" : "hover:bg-surface-hover/60"
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
              className={`w-1.5 h-1.5 rounded-full ${
                isAbove ? "bg-foreground" : "bg-surface-border"
              }`}
            />
            <span className="text-xs tracking-wider">{stock.symbol}</span>
          </div>

          <Link
            href={`/chart?symbol=${encodeURIComponent(stock.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
            title={`Open ${stock.symbol} Chart`}
          >
            <LineChart className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>

      {/* 3. Sector */}
      <td className="py-2.5 px-3.5 text-foreground/50 text-[11px] hidden lg:table-cell">{stock.sector}</td>

      {/* 4. Price */}
      <td className="py-2.5 px-3.5 text-right text-foreground">₹{price.toFixed(2)}</td>

      {/* 5. Day Move with Subdued Tint (Green/Red) */}
      <td className="py-2.5 px-3.5 text-right font-bold">
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

      {/* 6. Clean RVOL Number */}
      <td className="py-2.5 px-3.5 text-right">
        <span
          className={`font-bold ${
            rvol >= 3.0
              ? "text-foreground font-black"
              : "text-foreground/70"
          }`}
        >
          {rvol.toFixed(1)}x
        </span>
      </td>

      {/* 7. VWAP State (Clean colored text without tags) */}
      <td className="py-2.5 px-3.5 text-right font-bold hidden md:table-cell">
        <span
          className={`tabular-nums ${
            isAbove
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isAbove ? "+" : "-"}
          {Math.abs(vwapDist).toFixed(1)}%
        </span>
      </td>

      {/* 8. AI Action Badge (Single-Word: LONG, SHORT, WAIT) */}
      <td className="py-2.5 px-3.5 text-center">
        {isLong ? (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-foreground text-background shadow-xs tracking-wider">
            LONG
          </span>
        ) : isShort ? (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded border border-foreground/40 text-foreground tracking-wider">
            SHORT
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-surface-muted text-foreground/40 border border-surface-border tracking-wider">
            WAIT
          </span>
        )}
      </td>
    </tr>
  );
};
