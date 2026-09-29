"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ClosedPosition } from "@/lib/api";

export const ClosedPositionRow: React.FC<{ pos: ClosedPosition }> = ({ pos }) => {
  const isLong = pos.side === "LONG" || pos.side === "BUY";
  const isProfit = pos.pnl_inr >= 0;
  const closedTime = new Date(pos.closed_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <tr className="hover:bg-surface-hover/50 transition">
      <td className="py-3 px-4 font-sans">
        <div className="flex items-center gap-2">
          <Link href={`/chart?symbol=${pos.symbol}`} className="font-bold text-foreground hover:underline">
            {pos.symbol}
          </Link>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isLong
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {isLong ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5 inline" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5 inline" />}
            {pos.side}
          </span>
        </div>
      </td>
      <td className="py-3 px-3 text-right font-medium text-foreground">{pos.quantity}</td>
      <td className="py-3 px-3 text-right text-foreground/70">₹{pos.entry_price.toFixed(2)}</td>
      <td className="py-3 px-3 text-right font-medium text-foreground">₹{pos.exit_price.toFixed(2)}</td>
      <td className={`py-3 px-3 text-right font-bold tabular-nums ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)}
      </td>
      <td className={`py-3 px-3 text-right font-bold tabular-nums ${isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {isProfit ? "+" : ""}{pos.pnl_pct.toFixed(2)}%
      </td>
      <td className="py-3 px-3 text-center font-sans">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-muted text-foreground/60 border border-surface-border">
          {pos.exit_reason || "CLOSED"}
        </span>
      </td>
      <td className="py-3 px-4 text-right text-foreground/40 text-[11px]">{closedTime}</td>
    </tr>
  );
};
