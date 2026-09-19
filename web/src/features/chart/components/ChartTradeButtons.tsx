"use client";

import React from "react";

interface Props {
  symbol: string;
  onOpenOrderModal: (side: "LONG" | "SHORT") => void;
  isOrderModalOpen?: boolean;
  activeOrderSide?: "LONG" | "SHORT";
}

export const ChartTradeButtons: React.FC<Props> = ({
  symbol,
  onOpenOrderModal,
  isOrderModalOpen = false,
  activeOrderSide,
}) => {
  return (
    <div className="flex items-center gap-1.5 text-xs select-none">
      {/* 1. LONG Button (4 characters) */}
      <button
        type="button"
        onClick={() => onOpenOrderModal("LONG")}
        className={`h-7 px-2.5 rounded  font-black text-xs flex items-center gap-1 transition cursor-pointer border ${isOrderModalOpen && activeOrderSide === "LONG"
            ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
            : "bg-surface border-surface-border text-foreground/80 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-surface-hover"
          }`}
        title="Open LONG Order Panel (₹10k Slot)"
      >
        <span>LONG</span>
      </button>

      {/* 2. SHRT Button (4 characters) */}
      <button
        type="button"
        onClick={() => onOpenOrderModal("SHORT")}
        className={`h-7 px-2.5 rounded  font-black text-xs flex items-center gap-1 transition cursor-pointer border ${isOrderModalOpen && activeOrderSide === "SHORT"
            ? "bg-rose-600 text-white border-rose-500 shadow-xs"
            : "bg-surface border-surface-border text-foreground/80 hover:text-rose-500 hover:border-rose-500/50 hover:bg-surface-hover"
          }`}
        title="Open SHORT Order Panel (₹10k Slot)"
      >
        <span>SHRT</span>
      </button>
    </div>
  );
};
