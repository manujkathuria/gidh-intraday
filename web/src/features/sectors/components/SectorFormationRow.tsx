"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LineChart } from "lucide-react";
import { SectorItemWithStocks } from "../types";
import { ReplayStock } from "@/lib/api";

interface Props {
  sector: SectorItemWithStocks;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const SectorFormationRow: React.FC<Props> = ({ sector, isExpanded, onToggleExpand }) => {
  const avgMove = sector.avg_move_pct || 0;
  const vwapPct = sector.pct_above_vwap || 0;
  const avgRvol = sector.avg_rvol || 0;
  const stocks: ReplayStock[] = sector.stocks || [];
  const topGainer = sector.topGainer;

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className={`border-b border-surface-border transition-colors cursor-pointer group text-xs ${
          isExpanded ? "bg-surface-hover/80 border-l-2 border-l-foreground" : "hover:bg-surface-hover/60"
        }`}
      >
        {/* Expand Chevron */}
        <td className="py-2.5 px-3 text-center text-foreground/40 w-8">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 mx-auto text-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mx-auto text-foreground/40 group-hover:text-foreground" />
          )}
        </td>

        {/* Sector Name (Clean) */}
        <td className="py-2.5 px-3 font-bold text-foreground">
          <span className="tracking-wide">{sector.sector}</span>
        </td>

        {/* Civ Count */}
        <td className="py-2.5 px-3 text-center text-foreground/50 text-[11px]">{sector.civ_count}</td>

        {/* Avg Move % with subdued tint */}
        <td className="py-2.5 px-3 text-right font-bold">
          <span
            className={`tabular-nums ${
              avgMove > 0
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : avgMove < 0
                ? "text-rose-600 dark:text-rose-400 font-bold"
                : "text-foreground/60"
            }`}
          >
            {avgMove >= 0 ? "+" : ""}
            {avgMove.toFixed(2)}%
          </span>
        </td>

        {/* VWAP% (Clean colored numeric text, no progress bars) */}
        <td className="py-2.5 px-3 text-right font-bold">
          <span
            className={`tabular-nums ${
              vwapPct >= 60
                ? "text-emerald-600 dark:text-emerald-400"
                : vwapPct <= 40
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/70"
            }`}
          >
            {vwapPct.toFixed(0)}%
          </span>
        </td>

        {/* Clean RVOL Multiplier */}
        <td className="py-2.5 px-3 text-right font-bold">
          <span
            className={`tabular-nums ${
              avgRvol >= 2.0 ? "text-foreground font-black" : "text-foreground/70"
            }`}
          >
            {avgRvol.toFixed(1)}x
          </span>
        </td>

        {/* Advances / Declines Ratio */}
        <td className="py-2.5 px-3 text-right text-[11px] font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">{sector.advances ?? 0}</span>
          <span className="text-foreground/20 mx-1">/</span>
          <span className="text-rose-600 dark:text-rose-400">{sector.declines ?? 0}</span>
        </td>
      </tr>

      {/* Expanded Sibling Stocks Grid */}
      {isExpanded && stocks.length > 0 && (
        <tr className="bg-surface-muted/30 border-b border-surface-border">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
              {stocks.map((st: ReplayStock) => {
                const move = st.move_pct || 0;
                return (
                  <Link
                    key={st.symbol}
                    href={`/chart?symbol=${encodeURIComponent(st.symbol)}`}
                    className="bg-surface hover:bg-surface-hover border border-surface-border hover:border-foreground/40 rounded-md p-2 flex items-center justify-between shadow-xs transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          st.is_above_vwap ? "bg-foreground" : "bg-surface-border"
                        }`}
                      />
                      <span className="font-bold text-foreground group-hover:text-foreground truncate">
                        {st.symbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                      <span
                        className={`font-bold tabular-nums ${
                          move > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : move < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground/60"
                        }`}
                      >
                        {move >= 0 ? "+" : ""}
                        {move.toFixed(2)}%
                      </span>
                      <LineChart className="w-3.5 h-3.5 text-foreground/30 group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
