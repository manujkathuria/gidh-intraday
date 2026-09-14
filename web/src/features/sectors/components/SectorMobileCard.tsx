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

export const SectorMobileCard: React.FC<Props> = ({
  sector,
  isExpanded,
  onToggleExpand,
}) => {
  const avgMove = sector.avg_move_pct || 0;
  const vwapPct = sector.pct_above_vwap || 0;
  const avgRvol = sector.avg_rvol || 0;
  const stocks: ReplayStock[] = sector.stocks || [];
  const topGainer = sector.topGainer;

  return (
    <div className="border-b border-surface-border bg-surface flex flex-col transition-colors">
      {/* Tap Target Row */}
      <div
        onClick={onToggleExpand}
        className={`p-3.5 flex flex-col gap-2 select-none active:bg-surface-hover cursor-pointer ${
          isExpanded ? "bg-surface-hover/80 border-l-2 border-l-foreground" : ""
        }`}
      >
        {/* Top Row: Sector Name, Breadth Bar, Change % */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
            )}
            <span className="font-bold text-foreground text-sm tracking-wide">
              {sector.sector}
            </span>
            <span className="text-[11px] text-foreground/40">
              ({sector.civ_count})
            </span>
          </div>

          <span
            className={`text-sm font-bold tabular-nums ${
              avgMove > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : avgMove < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground/60"
            }`}
          >
            {avgMove >= 0 ? "+" : ""}
            {avgMove.toFixed(2)}%
          </span>
        </div>

        {/* Bottom Row: Breadth % bar, RVOL, Adv/Dec Ratio, Top Driver */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold tabular-nums ${
                vwapPct >= 60
                  ? "text-emerald-600 dark:text-emerald-400"
                  : vwapPct <= 40
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground/70"
              }`}
            >
              {vwapPct.toFixed(0)}% VWAP
            </span>
            <span className="text-foreground/20">•</span>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                avgRvol >= 2.0 ? "text-foreground font-black" : "text-foreground/60"
              }`}
            >
              {avgRvol.toFixed(1)}x RVOL
            </span>
          </div>

          <div className="text-[11px] font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">{sector.advances ?? 0}</span>
            <span className="text-foreground/20 mx-1">/</span>
            <span className="text-rose-600 dark:text-rose-400">{sector.declines ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Expanded Constituents Grid */}
      {isExpanded && stocks.length > 0 && (
        <div className="p-3 bg-surface-muted/30 border-t border-surface-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {stocks.map((st) => {
              const move = st.move_pct || 0;
              return (
                <div
                  key={st.symbol}
                  className="bg-surface border border-surface-border rounded p-2 flex items-center justify-between"
                >
                  <span className="font-bold text-foreground text-xs">{st.symbol}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        move > 0 ? "text-emerald-600 dark:text-emerald-400" : move < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground/60"
                      }`}
                    >
                      {move >= 0 ? "+" : ""}{move.toFixed(1)}%
                    </span>
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(st.symbol)}`}
                      className="p-1 rounded text-foreground/40 hover:text-foreground"
                    >
                      <LineChart className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
