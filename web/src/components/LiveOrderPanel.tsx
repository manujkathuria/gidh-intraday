"use client";

import React, { useEffect } from "react";
import { useLiveOrderStore } from "@/stores/liveOrderStore";
import {
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";

export const LiveOrderPanel: React.FC = () => {
  const { activePositions, initLiveOrders, isConnected, squareOff } =
    useLiveOrderStore();

  useEffect(() => {
    initLiveOrders();
  }, [initLiveOrders]);

  const positionsList = Object.values(activePositions);
  const totalSlots = 5;
  const usedSlots = positionsList.length;

  const totalPnLINR = positionsList.reduce((acc, p) => acc + p.pnl_inr, 0);
  const marginUsedINR = usedSlots * 10000;
  const totalCapitalPool = 50000;

  // Empty slots array to render 5 fixed cards
  const emptySlotsCount = Math.max(0, totalSlots - usedSlots);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="w-full bg-surface border-b border-surface-border px-5 py-2.5 flex flex-col gap-2 font-mono text-xs select-none">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-foreground/80 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              LIVE ORDER MANAGER (5 SLOTS · ₹50,000 POOL)
            </span>
          </div>

          <span className="text-[10px] text-foreground/50">
            Margin: ₹{marginUsedINR.toLocaleString("en-IN")} / ₹{totalCapitalPool.toLocaleString("en-IN")} ({usedSlots}/5 Slots)
          </span>
        </div>

        {/* Aggregate Real-Time P&L */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-foreground/50 uppercase font-bold">Total Live P&L:</span>
          <span className="text-sm font-black px-2 py-0.5 rounded border border-surface-border bg-surface-muted text-foreground">
            {totalPnLINR >= 0 ? "+" : ""}₹{totalPnLINR.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 5 Slot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {positionsList.map((pos) => {
          const isLong = pos.side === "LONG";
          const isProfit = pos.pnl_inr >= 0;

          // Milestone Stop Floor Label (Monochrome)
          let stopBadge = "SL -1.50% (HARD)";
          if (pos.stop_floor_pct >= 2.5) {
            stopBadge = "🔒 +2.50% LOCKED";
          } else if (pos.stop_floor_pct >= 1.0) {
            stopBadge = "🔒 +1.00% LOCKED";
          } else if (pos.stop_floor_pct >= 0.0) {
            stopBadge = "🛡️ 0.00% BREAKEVEN";
          }

          return (
            <div
              key={pos.symbol}
              className="bg-surface-muted border border-surface-border rounded p-2.5 flex flex-col justify-between gap-1.5 shadow-sm relative overflow-hidden"
            >
              {/* Header: Symbol & Side */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-foreground">
                    {pos.symbol}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                      isLong
                        ? "bg-foreground text-background"
                        : "border border-foreground/40 text-foreground"
                    }`}
                  >
                    {pos.side}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Square off ${pos.symbol} at market?`)) {
                      squareOff(pos.symbol);
                    }
                  }}
                  title="Square Off Position"
                  className="text-foreground/40 hover:text-foreground transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Price & Quantity Info */}
              <div className="flex items-center justify-between text-[11px] text-foreground/60">
                <span>
                  {pos.quantity} Qty @ ₹{pos.entry_price.toFixed(2)}
                </span>
                <span className="font-bold text-foreground">
                  LTP: ₹{pos.current_ltp.toFixed(2)}
                </span>
              </div>

              {/* P&L Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-surface-border">
                <span className="text-[10px] text-foreground/40 font-bold">P&L:</span>
                <div className="flex items-center gap-1 font-bold">
                  <span className="text-foreground">
                    {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-foreground/60">
                    ({isProfit ? "+" : ""}{pos.pnl_pct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Trailing Stop Floor Badge */}
              <div className="pt-0.5">
                <span className="block text-[9px] text-center font-bold px-1.5 py-0.5 rounded border border-surface-border bg-surface text-foreground/80">
                  {stopBadge}
                </span>
              </div>
            </div>
          );
        })}

        {/* Empty Slots */}
        {emptySlots.map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="border border-dashed border-surface-border/60 rounded p-2.5 flex flex-col items-center justify-center text-center text-foreground/30 min-h-[95px]"
          >
            <ShieldCheck className="w-4 h-4 mb-1 text-foreground/20" />
            <span className="text-[10px] font-bold">Slot {usedSlots + idx + 1} Available</span>
            <span className="text-[9px]">₹10,000 Margin</span>
          </div>
        ))}
      </div>
    </div>
  );
};
