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

export const SectorFormationRow: React.FC<Props> = ({
  sector,
  isExpanded,
  onToggleExpand,
}) => {
  const avgMove = sector.avg_move_pct || 0;
  const vwapPct = sector.pct_above_vwap || 0;
  const avgRvol = sector.avg_rvol || 0;
  const stocks: ReplayStock[] = sector.stocks || [];

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className="border-b border-surface-border transition-colors cursor-pointer hover:bg-surface-hover/60 text-xs"
      >
        {/* Expand Chevron */}
        <td className="py-2.5 px-3 text-center text-foreground/40">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 mx-auto" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mx-auto" />
          )}
        </td>

        {/* Sector Name */}
        <td className="py-2.5 px-3 font-bold text-foreground">
          <div className="flex items-center gap-2">
            <span>{sector.sector}</span>
            {vwapPct >= 80 && (
              <span className="px-1 py-0.2 rounded bg-foreground text-background text-[9px] font-bold">
                STRONG
              </span>
            )}
          </div>
        </td>

        {/* Civ Count */}
        <td className="py-2.5 px-3 text-center text-foreground/60">{sector.civ_count}</td>

        {/* Avg Move % with subtle tint */}
        <td className="py-2.5 px-3 text-right font-bold">
          <span
            className={
              avgMove > 0
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : avgMove < 0
                ? "text-rose-600 dark:text-rose-400 font-bold"
                : "text-foreground/60"
            }
          >
            {avgMove >= 0 ? "+" : ""}
            {avgMove.toFixed(2)}%
          </span>
        </td>

        {/* VWAP Breadth Bar */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5">
            <div className="w-20 bg-surface-border h-1 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-foreground rounded-full"
                style={{ width: `${vwapPct}%` }}
              />
            </div>
            <span className="font-bold text-xs text-foreground">
              {vwapPct.toFixed(0)}%
            </span>
          </div>
        </td>

        {/* Mean RVOL */}
        <td className="py-2.5 px-3 text-right font-bold text-foreground">
          {avgRvol.toFixed(2)}x
        </td>

        {/* Adv / Dec */}
        <td className="py-2.5 px-3 text-right text-foreground/70">
          {sector.advances ?? 0} / {sector.declines ?? 0}
        </td>
      </tr>

      {/* Expanded Sibling Stocks Table */}
      {isExpanded && stocks.length > 0 && (
        <tr className="bg-surface-muted/30 border-b border-surface-border">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {stocks.map((st: ReplayStock) => {
                const move = st.move_pct || 0;
                return (
                  <div
                    key={st.symbol}
                    className="bg-surface border border-surface-border rounded p-2 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          st.is_above_vwap ? "bg-foreground" : "bg-surface-border"
                        }`}
                      />
                      <span className="font-bold text-foreground">{st.symbol}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-foreground/60">₹{st.price?.toFixed(2)}</span>
                      <span
                        className={
                          move > 0
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : move < 0
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-foreground/60 font-bold"
                        }
                      >
                        {move >= 0 ? "+" : ""}
                        {move.toFixed(2)}%
                      </span>
                      <Link
                        href={`/chart?symbol=${encodeURIComponent(st.symbol)}`}
                        className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition"
                        title={`Open ${st.symbol} Chart`}
                      >
                        <LineChart className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
