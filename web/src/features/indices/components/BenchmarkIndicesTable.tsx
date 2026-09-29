"use client";

import React from "react";
import Link from "next/link";
import { LineChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { IndexItem } from "@/lib/types_market";

interface Props {
  indices: IndexItem[];
}

export const BenchmarkIndicesTable: React.FC<Props> = ({ indices }) => {
  return (
    <div className="w-full bg-surface border border-surface-border rounded-lg overflow-hidden shadow-xs">
      <div className="px-4 py-2.5 bg-surface-muted/60 border-b border-surface-border flex items-center justify-between">
        <span className="font-bold text-xs text-foreground tracking-wide uppercase">
          Benchmark & Major Indices
        </span>
        <span className="text-[11px] text-foreground/45">
          {indices.length} Core Indices
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-background text-foreground/50 uppercase text-[10px] tracking-wider border-b border-surface-border select-none">
            <tr>
              <th className="py-2.5 px-3.5 font-bold">Index</th>
              <th className="py-2.5 px-3.5 text-right font-bold">Spot (₹)</th>
              <th className="py-2.5 px-3.5 text-right font-bold">Change (Pts / %)</th>
              <th className="py-2.5 px-3.5 text-right font-bold hidden sm:table-cell">Day High / Low</th>
              <th className="py-2.5 px-3.5 text-right font-bold hidden md:table-cell">VWAP</th>
              <th className="py-2.5 px-3.5 text-center font-bold">Breadth (Adv/Dec)</th>
              <th className="py-2.5 px-3.5 text-center font-bold w-12">Chart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/30">
            {indices.map((idx) => {
              const isPos = idx.change_pct >= 0;
              const totalBreadth = (idx.advances || 0) + (idx.declines || 0);
              const advPct = totalBreadth > 0 ? ((idx.advances || 0) / totalBreadth) * 100 : 50;

              return (
                <tr
                  key={idx.symbol}
                  className="hover:bg-surface-hover/50 transition-colors group cursor-default"
                >
                  {/* Name */}
                  <td className="py-2.5 px-3.5 font-bold text-foreground whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="tracking-wide text-xs">{idx.symbol}</span>
                      <span className="text-[10px] text-foreground/40 font-normal">{idx.name}</span>
                    </div>
                  </td>

                  {/* Spot Price */}
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                    ₹{idx.spot_price.toLocaleString("en-IN")}
                  </td>

                  {/* Change */}
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {isPos ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      )}
                      <span className={isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {isPos ? "+" : ""}{idx.change_pts.toFixed(1)} ({idx.change_pct.toFixed(2)}%)
                      </span>
                    </div>
                  </td>

                  {/* High / Low */}
                  <td className="py-2.5 px-3.5 text-right font-mono text-foreground/60 whitespace-nowrap hidden sm:table-cell text-[11px]">
                    H: ₹{idx.high?.toLocaleString("en-IN") || "-"} | L: ₹{idx.low?.toLocaleString("en-IN") || "-"}
                  </td>

                  {/* VWAP */}
                  <td className="py-2.5 px-3.5 text-right font-mono text-foreground/70 whitespace-nowrap hidden md:table-cell">
                    ₹{idx.vwap ? idx.vwap.toLocaleString("en-IN") : "-"}
                  </td>

                  {/* Breadth Progress */}
                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-between w-full text-[10px] text-foreground/50 px-1 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{idx.advances || 0} A</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{idx.declines || 0} D</span>
                      </div>
                      <div className="w-full h-1.5 bg-rose-500/30 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${advPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Chart Action */}
                  <td className="py-2.5 px-3.5 text-center">
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(idx.symbol)}`}
                      className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition inline-flex"
                      title={`Open ${idx.symbol} Chart`}
                    >
                      <LineChart className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
