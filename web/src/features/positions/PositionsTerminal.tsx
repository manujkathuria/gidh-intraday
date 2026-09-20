"use client";

import React from "react";
import Link from "next/link";
import { Zap, RefreshCw, BarChart2, ShieldAlert } from "lucide-react";
import { PositionsTable } from "./components/PositionsTable";
import { PendingOrdersTable } from "./components/PendingOrdersTable";
import { ClosedPositionsTable } from "./components/ClosedPositionsTable";
import { usePositionsData } from "./hooks/usePositionsData";
import { useLiveOrderStore } from "@/stores/liveOrderStore";

export const PositionsTerminal: React.FC = () => {
  const {
    positionsList,
    usedSlots,
    totalPnLINR: unrealizedPnLINR,
    totalMarginUsed,
    totalCapitalPool,
    totalGrossExposure,
    isConnected,
    initLiveOrders,
    squareOff,
    loading,
  } = usePositionsData();

  const { managedOrders, cancelLimit, closedPositions, riskState, resetTripwireAction } = useLiveOrderStore();
  const ordersList = Object.values(managedOrders);
  const pendingOrders = ordersList.filter(
    (o) => o.status === "PENDING" || o.status === "TRIGGERING" || o.status === "SUBMITTED"
  );

  const realizedPnLINR = closedPositions.reduce((sum, p) => sum + p.pnl_inr, 0);
  const netDayPnLINR = unrealizedPnLINR + realizedPnLINR;

  const hasPositions = positionsList.length > 0;
  const hasOrders = pendingOrders.length > 0;
  const hasClosed = closedPositions.length > 0;
  const isNetProfit = netDayPnLINR >= 0;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Tripwire Fuse Tripped Alert Banner */}
      {(riskState?.kill_switch || riskState?.circuit_broken) && (
        <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-500 tracking-tight">
                TRIPWIRE FUSE TRIPPED — ORDER MANAGER DISABLED
              </div>
              <div className="text-xs text-foreground/70 mt-0.5">
                {riskState?.reason || "Rate limit exceeded (>5 orders placed in 3s). Live execution disabled for safety."}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              if (confirm("Reset Tripwire Fuse and re-enable live execution?")) {
                await resetTripwireAction();
              }
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            Reset Tripwire Fuse
          </button>
        </div>
      )}
      {/* 1. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Total Day P&L */}
        <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            <span>Net Day P&L</span>
            <span>{usedSlots} OPEN / {closedPositions.length} CLOSED</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black tabular-nums ${
                isNetProfit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isNetProfit ? "+" : ""}₹{netDayPnLINR.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
            <span>Realized: <strong className={realizedPnLINR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{realizedPnLINR >= 0 ? "+" : ""}₹{realizedPnLINR.toFixed(2)}</strong></span>
            <span>Unrealized: <strong className={unrealizedPnLINR >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{unrealizedPnLINR >= 0 ? "+" : ""}₹{unrealizedPnLINR.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Margin Deployed */}
        <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            <span>Margin Deployed</span>
            <span>5x MIS</span>
          </div>
          <div className="mt-1 text-2xl font-black tabular-nums text-foreground">
            ₹{totalMarginUsed.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-foreground/40 ml-1">
              / ₹{totalCapitalPool.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
            <span>Slots Used</span>
            <span className="font-bold text-foreground">{usedSlots} / 5 Slots</span>
          </div>
        </div>

        {/* Active & Pending Counts */}
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
              <span className="text-xl font-black text-foreground">{pendingOrders.length}</span>
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

        {/* Broker Gateway & Actions */}
        <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            <span>Broker Gateway</span>
            <button
              onClick={() => initLiveOrders()}
              className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
              title="Refresh positions & orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-foreground" : ""}`} />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${
                  isConnected ? "bg-emerald-500" : "bg-foreground/20"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isConnected ? "bg-emerald-500" : "bg-foreground/30"
                }`}
              />
            </span>
            <span className="text-sm font-bold text-foreground uppercase tracking-tight">
              {isConnected ? "LIVE (ZERODHA)" : "CONNECTING..."}
            </span>
          </div>
          <div className="mt-2 pt-1.5 border-t border-surface-border/50 flex justify-between items-center text-[10px]">
            <Link
              href="/chart"
              className="text-foreground hover:underline font-bold inline-flex items-center gap-1"
            >
              <BarChart2 className="w-3 h-3" />
              <span>Go to Chart</span>
            </Link>
            <span className="text-emerald-400 font-semibold">09:15 – 15:15 IST</span>
          </div>
        </div>
      </div>

      {/* 2. Active Positions Table */}
      {hasPositions && (
        <PositionsTable
          positions={positionsList}
          onSquareOff={squareOff}
        />
      )}

      {/* 3. Pending Limit Orders Table */}
      {hasOrders && (
        <PendingOrdersTable
          orders={ordersList}
          onCancelOrder={cancelLimit}
        />
      )}

      {/* 4. Closed Positions Table */}
      {hasClosed && (
        <ClosedPositionsTable
          closedPositions={closedPositions}
        />
      )}

      {/* 5. Clean Empty State when no positions, orders, or closed trades */}
      {!hasPositions && !hasOrders && !hasClosed && (
        <div className="bg-surface border border-surface-border rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-foreground/40 mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Positions or Orders</h3>
          <p className="text-xs text-foreground/50 mt-1 max-w-md">
            Your portfolio is clean. Open the Chart execution surface to place market entries or draggable passive limits.
          </p>
          <Link
            href="/chart"
            className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background font-bold text-xs hover:bg-foreground/90 transition shadow-xs flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Open Chart Studio</span>
          </Link>
        </div>
      )}
    </div>
  );
};

