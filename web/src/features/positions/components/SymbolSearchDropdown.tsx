"use client";

import React from "react";
import { Check } from "lucide-react";
import { FnoSymbolItem } from "../types";

interface Props {
  filteredSymbols: FnoSymbolItem[];
  selectedSymbol: string;
  onSelectSymbol: (sym: string) => void;
  setIsOpen: (open: boolean) => void;
}

export const SymbolSearchDropdown: React.FC<Props> = ({
  filteredSymbols,
  selectedSymbol,
  onSelectSymbol,
  setIsOpen,
}) => {
  return (
    <div className="absolute top-[100%] left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto border border-surface-border rounded-lg bg-surface shadow-xl divide-y divide-surface-border/50 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
      {filteredSymbols.length === 0 ? (
        <div className="px-3 py-3 text-center text-foreground/40 text-xs">No matching stocks found</div>
      ) : (
        filteredSymbols.map((item) => {
          const isSelected = selectedSymbol === item.symbol;
          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => {
                onSelectSymbol(item.symbol);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition cursor-pointer ${
                isSelected ? "bg-surface-muted font-bold text-foreground" : "hover:bg-surface-hover text-foreground/90"
              }`}
            >
              <div className="flex items-center gap-2">
                {isSelected ? <Check className="w-3 h-3 text-foreground" /> : <span className="w-3" />}
                <span className="font-bold text-xs">{item.symbol}</span>
                <span className="text-[10px] text-foreground/40">{item.sector}</span>
              </div>
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span>₹{item.price.toFixed(2)}</span>
                <span className={`text-[11px] font-bold ${item.move_pct >= 0 ? "text-foreground" : "text-foreground/70"}`}>
                  {item.move_pct >= 0 ? "+" : ""}
                  {item.move_pct.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};
