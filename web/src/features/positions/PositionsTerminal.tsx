"use client";

import React from "react";
import Link from "next/link";
import { Zap, BarChart2, ShieldAlert } from "lucide-react";
import { PositionsTable } from "./components/PositionsTable";
import { PendingOrdersTable } from "./components/PendingOrdersTable";
import { ClosedPositionsTable } from "./components/ClosedPositionsTable";
import { PositionsMetricsCards } from "./components/PositionsMetricsCards";
import { usePositionsData } from "./hooks/usePositionsData";
import { useLiveOrderStore } from "@/stores/liveOrderStore";

export const PositionsTerminal: React.FC = () => {
  const {
    positionsList,
    usedSlots,
    totalPnLINR: unrealizedPnLINR,
    totalMarginUsed,
    totalCapitalPool,
    isConnected,
    initLiveOrders,
    squareOff,
    loading,
  } = usePositionsData();

  const { managedOrders, cancelLimit, closedPositions, riskState, resetTripwireAction } = useLiveOrderStore();
  const ordersList = Object.values(managedOrders);
  const pendingOrders = ordersList.filter((o) => o.status === "PENDING" || o.status === "TRIGGERING" || o.status === "SUBMITTED");

  const realizedPnLINR = closedPositions.reduce((sum, p) => sum + p.pnl_inr, 0);
  const netDayPnLINR = unrealizedPnLINR + realizedPnLINR;

  const hasPositions = positionsList.length > 0;
  const hasOrders = pendingOrders.length > 0;
  const hasClosed = closedPositions.length > 0;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {(riskState?.kill_switch || riskState?.circuit_broken) && (
        <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-500 tracking-tight">TRIPWIRE FUSE TRIPPED — ORDER MANAGER DISABLED</div>
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

      <PositionsMetricsCards
        positionsList={positionsList}
        closedPositions={closedPositions}
        usedSlots={usedSlots}
        unrealizedPnLINR={unrealizedPnLINR}
        realizedPnLINR={realizedPnLINR}
        netDayPnLINR={netDayPnLINR}
        totalMarginUsed={totalMarginUsed}
        totalCapitalPool={totalCapitalPool}
        pendingCount={pendingOrders.length}
        isConnected={isConnected}
        loading={loading}
        initLiveOrders={initLiveOrders}
      />

      {hasPositions && <PositionsTable positions={positionsList} onSquareOff={squareOff} />}
      {hasOrders && <PendingOrdersTable orders={ordersList} onCancelOrder={cancelLimit} />}
      {hasClosed && <ClosedPositionsTable closedPositions={closedPositions} />}

      {!hasPositions && !hasOrders && !hasClosed && (
        <div className="bg-surface border border-surface-border rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-foreground/40 mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Positions or Orders</h3>
          <p className="text-xs text-foreground/50 mt-1 max-w-md">
            Your portfolio is clean. Open the Chart execution surface to place market entries or draggable passive limits.
          </p>
          <Link href="/chart" className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background font-bold text-xs hover:bg-foreground/90 transition shadow-xs flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Open Chart Studio</span>
          </Link>
        </div>
      )}
    </div>
  );
};
