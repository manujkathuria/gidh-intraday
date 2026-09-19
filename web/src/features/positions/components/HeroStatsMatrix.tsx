"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  totalPnLINR: number;
  usedSlots: number;
  totalMarginUsed: number;
  totalCapitalPool: number;
  availableSlots: number;
  totalGrossExposure: number;
  isConnected: boolean;
  onRefresh: () => void;
}

export const HeroStatsMatrix: React.FC<Props> = ({
  totalPnLINR,
  usedSlots,
  totalMarginUsed,
  totalCapitalPool,
  availableSlots,
  totalGrossExposure,
  isConnected,
  onRefresh,
}) => {
  const pnlPct = usedSlots > 0 ? (totalPnLINR / (usedSlots * 10000)) * 100 : 0;
  const isProfit = totalPnLINR > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
      {/* 1. Total Live P&L */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className=" text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            Total Live P&L
          </span>
          <span className="text-[10px]  text-foreground/40">
            {usedSlots}/5 SLOTS
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl  font-black tabular-nums text-foreground">
            {totalPnLINR >= 0 ? "+" : ""}₹{totalPnLINR.toFixed(2)}
          </span>
          <span className="text-[11px]  tabular-nums text-foreground/60">
            ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
          </span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>MTM Exposure</span>
          <span className=" font-bold text-foreground">₹{totalGrossExposure.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* 2. Margin Utilization */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className=" text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            Margin Utilized
          </span>
          <span className="text-[10px]  text-foreground/40">
            ₹10k/SLOT
          </span>
        </div>
        <div className="mt-1 text-xl  font-black tabular-nums text-foreground">
          ₹{totalMarginUsed.toLocaleString("en-IN")}{" "}
          <span className="text-xs font-normal text-foreground/40 ">/ ₹{totalCapitalPool.toLocaleString("en-IN")}</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-surface-border/50 flex flex-col gap-1">
          <div className="w-full bg-surface-muted h-1 rounded-full overflow-hidden">
            <div
              className="bg-foreground h-full rounded-full transition-all duration-300"
              style={{ width: `${(usedSlots / 5) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-foreground/50">
            <span>{availableSlots} Available</span>
            <span>5x Max Power</span>
          </div>
        </div>
      </div>

      {/* 3. Gross Exposure & Max Risk Floor */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className=" text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            Gross Leverage
          </span>
          <span className="text-[10px]  px-1 py-0.2 rounded bg-surface-muted border border-surface-border text-foreground/60">
            5x MIS
          </span>
        </div>
        <div className="mt-1 text-xl  font-black tabular-nums text-foreground">
          ₹{totalGrossExposure.toLocaleString("en-IN")}{" "}
          <span className="text-xs font-normal text-foreground/40 ">/ ₹2,50,000</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>Stop Floor</span>
          <span className=" font-bold text-foreground">1.00% MAE (-₹500)</span>
        </div>
      </div>

      {/* 4. Broker Connectivity & Execution Mode */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className=" text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
            Broker Gateway
          </span>
          <button
            onClick={onRefresh}
            className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
            title="Force Re-sync"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${isConnected ? "bg-foreground" : "bg-foreground/20"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-foreground" : "bg-foreground/30"}`} />
          </span>
          <span className="text-sm  font-bold text-foreground uppercase tracking-tight">
            {isConnected ? "ZERODHA LIVE" : "DISCONNECTED"}
          </span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-surface-border/50 flex justify-between text-[10px] text-foreground/50">
          <span>Execution</span>
          <span className=" font-bold text-foreground">Zero-Collar Trigger</span>
        </div>
      </div>
    </div>
  );
};
