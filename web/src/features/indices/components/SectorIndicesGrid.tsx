"use client";

import React from "react";
import Link from "next/link";
import { IndexItem } from "@/lib/types_market";

interface Props {
  sectorIndices: IndexItem[];
}

export const SectorIndicesGrid: React.FC<Props> = ({ sectorIndices }) => {
  return (
    <div className="w-full bg-surface border border-surface-border rounded-lg overflow-hidden shadow-xs flex flex-col">
      <div className="px-4 py-2.5 bg-surface-muted/60 border-b border-surface-border flex items-center justify-between">
        <span className="font-bold text-xs text-foreground tracking-wide uppercase">
          Sectoral Indices & Rotation
        </span>
        <span className="text-[11px] text-foreground/45">
          {sectorIndices.length} Sectors
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        {sectorIndices.map((sec) => {
          const isPos = sec.change_pct >= 0;
          return (
            <div
              key={sec.symbol}
              className="p-3 rounded-md bg-background/60 border border-surface-border hover:bg-surface-hover/50 transition flex flex-col justify-between gap-2 select-none"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-bold text-foreground truncate text-xs">
                  {sec.name}
                </span>
                <span
                  className={`text-xs font-mono font-black shrink-0 ${
                    isPos
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isPos ? "+" : ""}{sec.change_pct.toFixed(2)}%
                </span>
              </div>

              {/* Breadth & Top Leaders */}
              <div className="flex flex-col gap-1 text-[11px] text-foreground/60">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span>Adv/Dec:</span>
                  <span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{sec.advances || 0}</strong> /{" "}
                    <strong className="text-rose-600 dark:text-rose-400">{sec.declines || 0}</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-surface-border/40 text-[10px]">
                  {sec.top_gainer && (
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(sec.top_gainer)}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      ▲ {sec.top_gainer}
                    </Link>
                  )}
                  {sec.top_loser && (
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(sec.top_loser)}`}
                      className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                    >
                      ▼ {sec.top_loser}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
