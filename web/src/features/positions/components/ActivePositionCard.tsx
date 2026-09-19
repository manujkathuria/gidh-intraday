"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LineChart, AlertTriangle, X } from "lucide-react";
import { ActivePosition } from "@/lib/api";

interface Props {
  pos: ActivePosition;
  slotIndex: number;
  onSquareOff: (symbol: string) => void;
}

export const ActivePositionCard: React.FC<Props> = ({
  pos,
  slotIndex,
  onSquareOff,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const isLong = pos.side === "LONG" || pos.side === "BUY";
  const isProfit = pos.pnl_inr > 0;
  const isLoss = pos.pnl_inr < 0;

  let stopBadge = "SL -1.00% (FIXED MAE)";
  let stopBadgeStyle = "text-foreground/70 border-surface-border bg-surface-muted/50";
  if (pos.stop_floor_pct >= 2.5) {
    stopBadge = "+2.50% LOCKED";
    stopBadgeStyle = "text-foreground border-surface-border bg-surface-muted";
  } else if (pos.stop_floor_pct >= 1.0) {
    stopBadge = "+1.00% LOCKED";
    stopBadgeStyle = "text-foreground border-surface-border bg-surface-muted";
  } else if (pos.stop_floor_pct >= 0.0) {
    stopBadge = "0.00% BREAKEVEN";
    stopBadgeStyle = "text-foreground border-surface-border bg-surface-muted";
  }

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 shadow-xs relative overflow-hidden transition-colors hover:border-surface-border/90">
      {/* Confirmation Overlay Modal */}
      {showConfirm && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xs z-20 p-3 flex flex-col justify-between rounded-xl border border-surface-border animate-in fade-in duration-100">
          <div className="flex flex-col items-center text-center gap-1.5 pt-1">
            <div className="p-1.5 rounded-full bg-surface-muted text-foreground/80">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-foreground">
                Square Off {pos.symbol}?
              </h4>
              <p className="text-[10px] text-foreground/60 mt-0.5">
                Market exit for {pos.quantity} Qty
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <button
              onClick={() => {
                setShowConfirm(false);
                onSquareOff(pos.symbol);
              }}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs py-1.5 rounded-md shadow-xs transition cursor-pointer"
            >
              Confirm Exit
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full bg-surface-muted hover:bg-surface-hover text-foreground/70 font-bold text-xs py-1 rounded-md border border-surface-border transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Slot Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]  px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/50">
            S{slotIndex + 1}
          </span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-surface-border ${isLong
                ? "bg-surface text-foreground font-black"
                : "bg-surface-muted text-foreground/90"
              }`}
          >
            {pos.side}
          </span>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          title="Square off position"
          className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Symbol & Tactic */}
      <div>
        <h3 className="text-base font-black text-foreground tracking-tight">
          {pos.symbol}
        </h3>
        <span className="text-[10px] text-foreground/40 font-medium">
          {pos.tactic || "15M VWAP PLAY"}
        </span>
      </div>

      {/* Pricing Details: Clean 2-column tabular grid */}
      <div className="space-y-1 text-xs pt-1 border-t border-surface-border/40">
        <div className="flex justify-between text-foreground/60 text-[10px]">
          <span>Qty / Entry</span>
          <span className=" tabular-nums text-foreground">
            {pos.quantity} @ ₹{pos.entry_price.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-foreground/60 text-[10px]">
          <span>Live LTP</span>
          <span className=" font-black tabular-nums text-foreground">
            ₹{pos.current_ltp.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-foreground/60 text-[10px]">
          <span>SL / TP</span>
          <span className=" tabular-nums text-foreground/70">
            {pos.stop_loss_price ? `₹${pos.stop_loss_price.toFixed(2)}` : "—"} / {pos.target_price ? `₹${pos.target_price.toFixed(2)}` : "—"}
          </span>
        </div>
      </div>

      {/* P&L & MFE Block */}
      <div className="pt-2 border-t border-surface-border/60 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-foreground/40 uppercase font-bold">
            Live P&L
          </span>
          <div className="text-xs font-black tabular-nums text-foreground">
            {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)}{" "}
            <span className="text-[10px] font-normal text-foreground/60">
              ({isProfit ? "+" : ""}{pos.pnl_pct.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-foreground/50">
          <span>Peak MFE</span>
          <span className=" tabular-nums text-foreground/80">
            +{pos.mfe_pct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Trailing Stop Status Badge */}
      <div className={`text-[9px] text-center  font-bold px-1.5 py-0.5 rounded border ${stopBadgeStyle}`}>
        {stopBadge}
      </div>

      {/* Bottom Actions */}
      <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between">
        <Link
          href={`/chart?symbol=${encodeURIComponent(pos.symbol)}`}
          className="text-[10px] text-foreground/60 hover:text-foreground flex items-center gap-1 font-bold transition"
        >
          <LineChart className="w-3 h-3" />
          <span>Chart</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowConfirm(true)}
            className="text-[10px] font-bold px-2 py-0.5 rounded border border-surface-border text-foreground/70 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};
