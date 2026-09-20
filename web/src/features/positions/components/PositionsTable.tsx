"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, ExternalLink, Activity } from "lucide-react";
import { ActivePosition } from "@/lib/api";

interface Props {
  positions: ActivePosition[];
  onSquareOff: (symbol: string) => Promise<boolean>;
}

export const PositionsTable: React.FC<Props> = ({ positions, onSquareOff }) => {
  const [squaringOffSym, setSquaringOffSym] = useState<string | null>(null);

  const handleSquareOff = async (symbol: string) => {
    setSquaringOffSym(symbol);
    await onSquareOff(symbol);
    setSquaringOffSym(null);
  };

  if (positions.length === 0) return null;

  return (
    <div className="w-full bg-surface border border-surface-border rounded-xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-muted/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Active Positions ({positions.length})
          </h3>
        </div>
        <span className="text-[10px] text-foreground/50 font-mono">
          Manual & AI Intraday MIS
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border/60 text-[10px] font-semibold text-foreground/50 uppercase tracking-wider bg-surface-muted/20">
              <th className="px-4 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Side</th>
              <th className="px-3 py-2.5 text-right">Quantity</th>
              <th className="px-3 py-2.5 text-right">Avg Entry</th>
              <th className="px-3 py-2.5 text-right">Current LTP</th>
              <th className="px-3 py-2.5 text-right">Live P&L</th>
              <th className="px-3 py-2.5 text-right">Stop Loss</th>
              <th className="px-3 py-2.5 text-right">Target</th>
              <th className="px-4 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/40 font-mono">
            {positions.map((pos) => {
              const isLong = pos.side === "LONG";
              const isProfit = pos.pnl_inr >= 0;
              const isSquaringOff = squaringOffSym === pos.symbol;

              return (
                <tr
                  key={pos.symbol}
                  className="hover:bg-surface-muted/30 transition-colors group"
                >
                  {/* Symbol */}
                  <td className="px-4 py-3 font-bold text-foreground font-sans">
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(pos.symbol)}`}
                      className="inline-flex items-center gap-1.5 hover:underline text-foreground"
                    >
                      <span>{pos.symbol}</span>
                      <ExternalLink className="w-3 h-3 text-foreground/30 group-hover:text-foreground/70 transition" />
                    </Link>
                  </td>

                  {/* Side */}
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-sans ${
                        isLong
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {isLong ? "BUY" : "SELL"}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-3 text-right font-bold text-foreground tabular-nums">
                    {pos.quantity} <span className="text-[10px] font-normal text-foreground/40 font-sans">sh</span>
                  </td>

                  {/* Avg Entry */}
                  <td className="px-3 py-3 text-right tabular-nums text-foreground/80">
                    ₹{pos.entry_price.toFixed(2)}
                  </td>

                  {/* Current LTP */}
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-foreground">
                    ₹{pos.current_ltp.toFixed(2)}
                  </td>

                  {/* Live P&L */}
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded ${
                        isProfit
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                      }`}
                    >
                      {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)} ({isProfit ? "+" : ""}
                      {pos.pnl_pct.toFixed(2)}%)
                    </span>
                  </td>

                  {/* Stop Loss */}
                  <td className="px-3 py-3 text-right tabular-nums text-rose-500/80 dark:text-rose-400/80">
                    {pos.stop_loss_price ? `₹${pos.stop_loss_price.toFixed(2)}` : "—"}
                  </td>

                  {/* Target */}
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-500/80 dark:text-emerald-400/80">
                    {pos.target_price ? `₹${pos.target_price.toFixed(2)}` : "—"}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleSquareOff(pos.symbol)}
                      disabled={isSquaringOff}
                      className="px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 mx-auto shadow-2xs font-sans disabled:opacity-50"
                    >
                      {isSquaringOff ? (
                        <Activity className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="w-3 h-3" />
                      )}
                      <span>Square Off</span>
                    </button>
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
