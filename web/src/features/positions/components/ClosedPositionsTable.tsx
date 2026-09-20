"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { ClosedPosition } from "@/lib/api";

interface ClosedPositionsTableProps {
  closedPositions: ClosedPosition[];
}

export const ClosedPositionsTable: React.FC<ClosedPositionsTableProps> = ({ closedPositions }) => {
  if (closedPositions.length === 0) {
    return null;
  }

  const totalRealizedPnl = closedPositions.reduce((acc, pos) => acc + pos.pnl_inr, 0);
  const isTotalProfit = totalRealizedPnl >= 0;

  return (
    <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-foreground/50" />
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Closed Positions (Today)
          </h2>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted border border-surface-border text-foreground/70">
            {closedPositions.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-foreground/50 text-[11px] font-medium">Realized P&L:</span>
          <span
            className={`font-mono font-bold ${
              isTotalProfit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isTotalProfit ? "+" : ""}₹{totalRealizedPnl.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/30 text-[10px] uppercase font-bold text-foreground/50 tracking-wider">
              <th className="py-2.5 px-4">Symbol / Side</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Entry Price</th>
              <th className="py-2.5 px-3 text-right">Exit Price</th>
              <th className="py-2.5 px-3 text-right">Realized P&L (₹)</th>
              <th className="py-2.5 px-3 text-right">Return (%)</th>
              <th className="py-2.5 px-3 text-center">Reason</th>
              <th className="py-2.5 px-4 text-right">Closed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 font-mono">
            {closedPositions.map((pos) => {
              const isLong = pos.side === "LONG" || pos.side === "BUY";
              const isProfit = pos.pnl_inr >= 0;
              const closedTime = new Date(pos.closed_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <tr key={`${pos.symbol}-${pos.closed_at}`} className="hover:bg-surface-hover/50 transition">
                  {/* Symbol / Side */}
                  <td className="py-3 px-4 font-sans">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/chart?symbol=${pos.symbol}`}
                        className="font-bold text-foreground hover:underline"
                      >
                        {pos.symbol}
                      </Link>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isLong ? (
                          <ArrowUpRight className="w-2.5 h-2.5 mr-0.5 inline" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5 mr-0.5 inline" />
                        )}
                        {pos.side}
                      </span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3 text-right font-medium text-foreground">
                    {pos.quantity}
                  </td>

                  {/* Entry Price */}
                  <td className="py-3 px-3 text-right text-foreground/70">
                    ₹{pos.entry_price.toFixed(2)}
                  </td>

                  {/* Exit Price */}
                  <td className="py-3 px-3 text-right font-medium text-foreground">
                    ₹{pos.exit_price.toFixed(2)}
                  </td>

                  {/* Realized P&L */}
                  <td
                    className={`py-3 px-3 text-right font-bold tabular-nums ${
                      isProfit
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)}
                  </td>

                  {/* Return % */}
                  <td
                    className={`py-3 px-3 text-right font-bold tabular-nums ${
                      isProfit
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isProfit ? "+" : ""}{pos.pnl_pct.toFixed(2)}%
                  </td>

                  {/* Reason */}
                  <td className="py-3 px-3 text-center font-sans">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-foreground/60 border border-surface-border">
                      {pos.exit_reason || "CLOSED"}
                    </span>
                  </td>

                  {/* Closed At */}
                  <td className="py-3 px-4 text-right text-foreground/40 text-[11px]">
                    {closedTime}
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
