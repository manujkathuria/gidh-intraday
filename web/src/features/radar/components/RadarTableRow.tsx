"use client";

import React from "react";
import { ReplayStock } from "@/lib/api";

interface Props {
  stock: ReplayStock;
  index: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

function formatOI(val: number): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
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

  // Calculate points change: 1 rupee = 1 point
  // Pts = Price - Previous Close = Price * (move_pct / (100 + move_pct))
  const pts = (100 + move !== 0) ? (price * move) / (100 + move) : 0;

  // Prior Day High (PDH) & Prior Day Low (PDL) Context
  const pdh = stock.pdh || 0;
  const pdl = stock.pdl || 0;
  const isAbovePdh = pdh > 0 && price > pdh;
  const isBelowPdl = pdl > 0 && price < pdl;
  const pdhDistPct = pdh > 0 ? ((price - pdh) / pdh) * 100 : 0;
  const pdlDistPct = pdl > 0 ? ((price - pdl) / pdl) * 100 : 0;

  // Futures Macro 1-Day Context (from yesterday's EOD daily data)
  const oiLatest = stock.oi_latest || 0;
  const oiChangePct = stock.oi_change_pct || 0;

  return (
    <tr
      onClick={() => onSelect(stock.symbol)}
      className={`border-b border-surface-border transition-colors cursor-pointer group text-xs ${
        isSelected ? "bg-surface-hover font-semibold border-l-2 border-l-foreground" : "hover:bg-surface-hover/60"
      }`}
    >
      {/* 1. Rank # */}
      <td className="py-2.5 px-3 text-center text-foreground/30 text-[11px] w-12 hidden sm:table-cell">
        {index + 1}
      </td>

      {/* 2. Symbol */}
      <td className="py-2.5 px-4 font-bold text-foreground w-[24%]">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isAbove ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span className="text-xs tracking-wider">{stock.symbol}</span>
        </div>
      </td>

      {/* 3. Unified Price, Points, and Change % */}
      <td className="py-2 px-4 text-right w-[20%]">
        <div className="flex flex-col items-end leading-tight">
          <span className="font-semibold text-foreground text-xs tabular-nums">
            ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              move > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : move < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/50"
            }`}
          >
            {pts >= 0 ? "+" : ""}{pts.toFixed(2)} ({move >= 0 ? "+" : ""}{move.toFixed(2)}%)
          </span>
        </div>
      </td>

      {/* 4. Relative Volume (RVOL) */}
      <td className="py-2.5 px-4 text-right w-[14%]">
        <span
          className={`font-bold tabular-nums ${
            rvol >= 3.0
              ? "text-foreground font-black"
              : "text-foreground/70"
          }`}
        >
          {rvol.toFixed(1)}x
        </span>
      </td>

      {/* 5. VWAP Distance % */}
      <td className="py-2.5 px-4 text-right font-semibold w-[14%]">
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

      {/* 6. Prior Day High / Low Context */}
      <td className="py-2.5 px-4 text-right font-semibold w-[14%] hidden md:table-cell">
        {isAbovePdh ? (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            &gt; PDH (+{pdhDistPct.toFixed(1)}%)
          </span>
        ) : isBelowPdl ? (
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            &lt; PDL ({pdlDistPct.toFixed(1)}%)
          </span>
        ) : (
          <span className="text-[11px] text-foreground/40 font-medium">
            Inside
          </span>
        )}
      </td>

      {/* 7. Futures Macro 1-Day Open Interest Inflow */}
      <td className="py-2 px-4 text-right w-[14%] hidden sm:table-cell">
        {oiLatest > 0 ? (
          <div className="flex flex-col items-end leading-tight">
            <span className="font-semibold text-foreground text-xs tabular-nums">
              {formatOI(oiLatest)}
            </span>
            <span
              className={`text-[10px] font-bold tabular-nums ${
                oiChangePct > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : oiChangePct < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground/40"
              }`}
            >
              {oiChangePct >= 0 ? "+" : ""}{oiChangePct.toFixed(1)}% (1D)
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-foreground/30 font-medium">-</span>
        )}
      </td>
    </tr>
  );
};
