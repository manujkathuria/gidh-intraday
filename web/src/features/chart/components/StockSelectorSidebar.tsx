"use client";

import React from "react";
import { Search, Layers } from "lucide-react";
import { StockSummaryItem } from "../types";

interface Props {
  allSymbols: StockSummaryItem[];
  filteredSymbols: StockSummaryItem[];
  activeSymbol: string;
  selectedDate: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectSymbol: (symbol: string) => void;
}

export const StockSelectorSidebar: React.FC<Props> = ({
  allSymbols,
  filteredSymbols,
  activeSymbol,
  selectedDate,
  searchTerm,
  setSearchTerm,
  onSelectSymbol,
}) => {
  return (
    <div className="w-80 bg-surface border border-surface-border rounded-lg flex flex-col overflow-hidden shrink-0">
      <div className="p-3 border-b border-surface-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-wider uppercase text-foreground/70 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> F&O Universe ({allSymbols.length})
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-foreground/60 border border-surface-border">
            {selectedDate || "LIVE"}
          </span>
        </div>

        {/* Tailwind Plus Style Precision Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search stock or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md bg-surface-muted/40 pl-8 pr-2.5 py-1 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-surface-border text-xs">
        {filteredSymbols.length === 0 ? (
          <div className="p-6 text-center text-foreground/40 text-xs">
            No stocks found
          </div>
        ) : (
          filteredSymbols.map((item) => {
            const isSelected = item.symbol === activeSymbol;
            const move = item.move_pct || 0;

            return (
              <button
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className={`w-full p-2.5 text-left transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-foreground text-background font-bold shadow-sm"
                    : "hover:bg-surface-hover text-foreground/80 hover:text-foreground"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-tight">
                      {item.symbol}
                    </span>
                    {item.rvol >= 4.0 && (
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          isSelected
                            ? "bg-background text-foreground"
                            : "bg-foreground text-background"
                        }`}
                      >
                        RVOL
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] ${
                      isSelected ? "text-background/70" : "text-foreground/40"
                    }`}
                  >
                    {item.sector}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="font-semibold">₹{item.price.toFixed(2)}</span>
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected
                        ? "text-background"
                        : move > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : move < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-foreground/60"
                    }`}
                  >
                    {move >= 0 ? "+" : ""}
                    {move.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
