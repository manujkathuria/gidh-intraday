"use client";

import React from "react";
import Link from "next/link";
import { HeavyweightImpact } from "@/lib/types_market";

interface Props {
  heavyweights: HeavyweightImpact[];
}

export const HeavyweightAttribution: React.FC<Props> = ({ heavyweights }) => {
  const topMovers = heavyweights.slice(0, 10);
  const maxImpact = Math.max(...topMovers.map((m) => Math.abs(m.point_impact)), 1);

  return (
    <div className="w-full bg-surface border border-surface-border rounded-lg overflow-hidden shadow-xs flex flex-col">
      <div className="px-4 py-2.5 bg-surface-muted/60 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-foreground tracking-wide uppercase">
            Heavyweight Attribution (NIFTY 50 Points Impact)
          </span>
        </div>
        <span className="text-[11px] text-foreground/45">
          Top 10 Index Movers
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {topMovers.map((item) => {
          const isPos = item.point_impact >= 0;
          const barWidth = Math.min((Math.abs(item.point_impact) / maxImpact) * 100, 100);

          return (
            <Link
              key={item.symbol}
              href={`/chart?symbol=${encodeURIComponent(item.symbol)}`}
              className="p-2 rounded-md bg-background/50 border border-surface-border/60 hover:bg-surface-hover/50 transition flex flex-col gap-1.5 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground group-hover:underline">
                    {item.symbol}
                  </span>
                  <span className="text-[10px] text-foreground/40 font-mono">
                    ({item.weight_pct}% wt)
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`text-[11px] font-bold ${
                      item.change_pct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                  </span>
                  <span
                    className={`text-xs font-black ${
                      isPos
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isPos ? "+" : ""}{item.point_impact.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Visual Point Contribution Bar */}
              <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPos ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
