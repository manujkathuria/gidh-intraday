"use client";

import React from "react";
import { Search } from "lucide-react";
import { FnoSymbolItem } from "../types";

interface Props {
  searchFilter: string;
  setSearchFilter: (val: string) => void;
  filteredSymbols: FnoSymbolItem[];
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
}

export const SymbolSearchList: React.FC<Props> = ({
  searchFilter,
  setSearchFilter,
  filteredSymbols,
  selectedSymbol,
  onSelectSymbol,
}) => {
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <label className="text-[11px] font-bold text-foreground/60 uppercase">
        Select Stock from 210 F&O Universe
      </label>

      {/* Tailwind Plus Style Precision Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Type to filter stock (e.g. RELIANCE)..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="block w-full rounded-md bg-surface-muted pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
        />
      </div>

      <div className="max-h-40 overflow-y-auto border border-surface-border rounded-md bg-surface divide-y divide-surface-border custom-scrollbar mt-1">
        {filteredSymbols.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => onSelectSymbol(item.symbol)}
            className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition ${
              selectedSymbol === item.symbol
                ? "bg-foreground text-background font-black"
                : "hover:bg-surface-hover text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">{item.symbol}</span>
              <span className="text-[10px] text-foreground/50">
                {item.sector}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span>₹{item.price.toFixed(2)}</span>
              <span className="font-bold">
                {item.move_pct >= 0 ? "+" : ""}
                {item.move_pct.toFixed(2)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
