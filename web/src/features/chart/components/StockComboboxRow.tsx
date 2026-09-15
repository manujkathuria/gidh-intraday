"use client";

import React from "react";
import { ComboboxOption } from "@headlessui/react";
import { StockSummaryItem } from "../types";

interface Props {
  stock: StockSummaryItem;
}

export const StockComboboxRow: React.FC<Props> = ({ stock }) => {
  const move = stock.move_pct || 0;
  return (
    <ComboboxOption
      value={stock.symbol}
      className="cursor-pointer px-3 py-2 rounded-lg select-none data-focus:bg-surface-hover data-focus:outline-hidden flex items-center justify-between transition-colors"
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className="font-bold text-xs tracking-tight">{stock.symbol}</span>
        <span className="text-[10px] text-foreground/40 truncate">{stock.sector}</span>
      </div>

      <div className="text-right flex flex-col items-end shrink-0">
        <span className="font-semibold text-xs text-foreground">
          ₹{stock.price.toFixed(2)}
        </span>
        <span
          className={`text-[10px] font-bold ${
            move > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : move < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-foreground/50"
          }`}
        >
          {move >= 0 ? "+" : ""}
          {move.toFixed(2)}%
        </span>
      </div>
    </ComboboxOption>
  );
};
