"use client";

import React from "react";
import { FnoSymbolItem } from "../types";

interface Props {
  selectedStock?: FnoSymbolItem;
  targetEntryPrice: string;
  onLimitPriceChange: (val: string) => void;
}

export const OrderLimitPriceInput: React.FC<Props> = ({
  selectedStock,
  targetEntryPrice,
  onLimitPriceChange,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          Limit Entry Price (₹)
        </label>
        {selectedStock && (
          <button
            type="button"
            onClick={() => onLimitPriceChange(selectedStock.price.toFixed(2))}
            className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer"
          >
            Use LTP (₹{selectedStock.price.toFixed(2)})
          </button>
        )}
      </div>
      <input
        type="number"
        step="0.05"
        placeholder={selectedStock ? `e.g. ${selectedStock.price.toFixed(2)}` : "Enter trigger price"}
        value={targetEntryPrice}
        onChange={(e) => onLimitPriceChange(e.target.value)}
        className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground transition tabular-nums"
      />
    </div>
  );
};
