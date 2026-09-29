"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw, BarChart2 } from "lucide-react";
import { ClosedPosition, ActivePosition } from "@/lib/api";

interface Props {
  positionsList: ActivePosition[];
  closedPositions: ClosedPosition[];
  usedSlots: number;
  unrealizedPnLINR: number;
  realizedPnLINR: number;
  netDayPnLINR: number;
  totalMarginUsed: number;
  totalCapitalPool: number;
  pendingCount: number;
  isConnected: boolean;
  loading: boolean;
  initLiveOrders: () => Promise<void>;
}

export const PositionsMetricsCards: React.FC<Props> = ({
  positionsList,
  closedPositions,
  usedSlots,
  unrealizedPnLINR,
  realizedPnLINR,
  netDayPnLINR,
  totalMarginUsed,
  totalCapitalPool,
  pendingCount,
  isConnected,
  loading,
  initLiveOrders,
}) => {
  const isNetProfit = netDayPnLINR >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
      <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <span>Net Day P&L</span>
          <span>{usedSlots} OPEN / {closedPositions.length} CLOSED</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-2xl font-black tabular-nums ${isNetProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isNetProfit ? "+" : ""}₹{netDayPnLINR.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>Realized: <strong className={realizedPnLINR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{realizedPnLINR >= 0 ? "+" : ""}₹{realizedPnLINR.toFixed(2)}</strong></span>
          <span>Unrealized: <strong className={unrealizedPnLINR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{unrealizedPnLINR >= 0 ? "+" : ""}₹{unrealizedPnLINR.toFixed(2)}</strong></span>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <span>Margin Deployed</span>
          <span>5x MIS</span>
        </div>
        <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
          ₹{totalMarginUsed.toLocaleString("en-IN")}
          <span className="text-xs font-normal text-foreground/40 ml-1">/ ₹{totalCapitalPool.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>Slots Used</span>
          <span className="font-bold text-foreground">{usedSlots} / 5 Slots</span>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <span>Order Pipeline</span>
          <span className="text-foreground/40 font-mono">Real-time</span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div>
            <span className="text-xl font-black text-foreground">{positionsList.length}</span>
            <span className="text-[10px] text-foreground/50 block font-medium">Positions</span>
          </div>
          <div className="h-6 w-[1px] bg-surface-border" />
          <div>
            <span className="text-xl font-black text-foreground">{pendingCount}</span>
            <span className="text-[10px] text-foreground/50 block font-medium">Pending Limits</span>
          </div>
          <div className="h-6 w-[1px] bg-surface-border" />
          <div>
            <span className="text-xl font-black text-foreground">{closedPositions.length}</span>
            <span className="text-[10px] text-foreground/50 block font-medium">Closed</span>
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>Execution Protocol</span>
          <span className="font-bold text-foreground">1.0% MAE / 2R Fixed</span>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          <span>Broker Gateway</span>
          <button onClick={() => initLiveOrders()} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer" title="Refresh positions & orders">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-foreground" : ""}`} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${isConnected ? "bg-emerald-500" : "bg-foreground/20"}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? "bg-emerald-500" : "bg-foreground/30"}`} />
          </span>
          <span className="text-sm font-bold text-foreground uppercase tracking-tight">
            {isConnected ? "LIVE (ZERODHA)" : "CONNECTING..."}
          </span>
        </div>
        <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between items-center text-[10px]">
          <Link href="/chart" className="text-foreground hover:underline font-bold inline-flex items-center gap-1">
            <BarChart2 className="w-3 h-3" />
            <span>Go to Chart</span>
          </Link>
          <span className="text-emerald-400 font-semibold">09:15 – 15:15 IST</span>
        </div>
      </div>
    </div>
  );
};
