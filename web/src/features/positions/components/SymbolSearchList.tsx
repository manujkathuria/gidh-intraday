"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, Check, ChevronsUpDown } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStock = filteredSymbols.find((s) => s.symbol === selectedSymbol);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    onSelectSymbol("");
    setSearchFilter("");
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs relative" ref={containerRef}>
      <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider flex items-center justify-between">
        <span>Stock (210 F&O Universe)</span>
        {selectedSymbol && (
          <span className="text-[10px] text-foreground/50 font-normal">Selected</span>
        )}
      </label>

      {/* When a stock is selected and dropdown is closed: show a sleek compact card */}
      {selectedSymbol && selectedStock && !isOpen ? (
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border hover:border-foreground/30 transition">
          <div className="flex items-center gap-2.5">
            <div className="px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-xs font-black tracking-tight text-foreground">
              {selectedStock.symbol}
            </div>
            <span className="text-[10px] text-foreground/50 uppercase">
              {selectedStock.sector}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold tabular-nums text-foreground">
                ₹{selectedStock.price.toFixed(2)}
              </div>
              <div
                className={`text-[10px] font-bold tabular-nums ${
                  selectedStock.move_pct >= 0 ? "text-foreground" : "text-foreground/70"
                }`}
              >
                {selectedStock.move_pct >= 0 ? "+" : ""}
                {selectedStock.move_pct.toFixed(2)}%
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
              title="Change stock"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Search Combobox Input */
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search stock (e.g. RELIANCE, HDFCBANK)..."
            value={searchFilter}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setIsOpen(true);
            }}
            className="block w-full rounded-lg bg-surface-muted pl-8 pr-7 py-2 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground/60 transition"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-0.5"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-[100%] left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto border border-surface-border rounded-lg bg-surface shadow-xl divide-y divide-surface-border/50 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {filteredSymbols.length === 0 ? (
            <div className="px-3 py-3 text-center text-foreground/40 text-xs">
              No matching stocks found
            </div>
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
                    isSelected
                      ? "bg-surface-muted font-bold text-foreground"
                      : "hover:bg-surface-hover text-foreground/90"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <Check className="w-3 h-3 text-foreground" />
                    ) : (
                      <span className="w-3" />
                    )}
                    <span className="font-bold text-xs">{item.symbol}</span>
                    <span className="text-[10px] text-foreground/40">
                      {item.sector}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    <span>₹{item.price.toFixed(2)}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        item.move_pct >= 0 ? "text-foreground" : "text-foreground/70"
                      }`}
                    >
                      {item.move_pct >= 0 ? "+" : ""}
                      {item.move_pct.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
