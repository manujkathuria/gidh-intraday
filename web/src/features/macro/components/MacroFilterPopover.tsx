"use client";

import React from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { SlidersHorizontal, RotateCcw, Check } from "lucide-react";

export type InflowGateMode = "OR" | "AND" | "INFLOW_ONLY" | "OI_ONLY";

interface Props {
  minPrice: number;
  maxPrice: number;
  setPriceRange: (min: number, max: number) => void;
  minInflow: number;
  setMinInflow: (val: number) => void;
  minOiPct: number;
  setMinOiPct: (val: number) => void;
  gateMode: InflowGateMode;
  setGateMode: (mode: InflowGateMode) => void;
  onReset: () => void;
  isCustomized: boolean;
}

export const MacroFilterPopover: React.FC<Props> = ({
  minPrice,
  maxPrice,
  setPriceRange,
  minInflow,
  setMinInflow,
  minOiPct,
  setMinOiPct,
  gateMode,
  setGateMode,
  onReset,
  isCustomized,
}) => {
  return (
    <Popover className="relative select-none text-xs">
      <PopoverButton className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface text-foreground/80 hover:text-foreground hover:bg-surface-hover border border-surface-border cursor-pointer transition focus:outline-none">
        <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/50" />
        <span className="font-semibold text-xs tracking-wide">
          Filter Playground
        </span>
        {isCustomized && (
          <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        transition
        className="z-50 mt-1.5 w-80 rounded-xl bg-surface border border-surface-border p-4 shadow-2xl transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 focus:outline-none flex flex-col gap-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <div className="flex flex-col">
            <span className="font-bold text-xs text-foreground uppercase tracking-wider">
              Quantitative Controls
            </span>
            <span className="text-[10px] text-foreground/50">
              Tune liquidity & institutional inflow levers
            </span>
          </div>
          {isCustomized && (
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-bold text-foreground/50 hover:text-foreground flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* 1. PRICE LIQUIDITY BAND */}
        <div className="flex flex-col gap-2 bg-surface-muted/30 p-2.5 rounded-lg border border-surface-border/50">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground tracking-wide text-[11px] uppercase">
              1. Price Liquidity Band
            </span>
            <span className="font-mono text-[11px] font-bold text-foreground">
              ₹{minPrice} – {maxPrice >= 10000 ? "∞" : `₹${maxPrice}`}
            </span>
          </div>

          {/* Quick Price Preset Chips */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPriceRange(300, 7000)}
              className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                minPrice === 300 && maxPrice === 7000
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              ₹300 – ₹7k (Std)
            </button>
            <button
              type="button"
              onClick={() => setPriceRange(500, 3500)}
              className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                minPrice === 500 && maxPrice === 3500
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              ₹500 – ₹3.5k
            </button>
            <button
              type="button"
              onClick={() => setPriceRange(0, 10000)}
              className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                minPrice === 0 && maxPrice >= 10000
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              All Prices
            </button>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-foreground/60">
                <span>Min Price:</span>
                <span className="font-mono text-foreground font-semibold">₹{minPrice}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={minPrice}
                onChange={(e) => setPriceRange(Number(e.target.value), maxPrice)}
                className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-foreground/60">
                <span>Max Price:</span>
                <span className="font-mono text-foreground font-semibold">
                  {maxPrice >= 10000 ? "No Cap (10,000+)" : `₹${maxPrice}`}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={maxPrice}
                onChange={(e) => setPriceRange(minPrice, Number(e.target.value))}
                className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. INSTITUTIONAL INFLOW GATE */}
        <div className="flex flex-col gap-2.5 bg-surface-muted/30 p-2.5 rounded-lg border border-surface-border/50">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground tracking-wide text-[11px] uppercase">
              2. Institutional Inflow Gate
            </span>
            <span className="font-mono text-[10px] font-semibold text-foreground/60">
              {gateMode === "OR" ? "Inflow OR OI" : gateMode === "AND" ? "Inflow AND OI" : gateMode}
            </span>
          </div>

          {/* Gate Mode Selector */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setGateMode("OR")}
              className={`py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                gateMode === "OR"
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              Inflow OR OI
            </button>
            <button
              type="button"
              onClick={() => setGateMode("AND")}
              className={`py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                gateMode === "AND"
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              Inflow & OI
            </button>
            <button
              type="button"
              onClick={() => setGateMode("INFLOW_ONLY")}
              className={`py-1 rounded text-[10px] font-medium border cursor-pointer transition text-center ${
                gateMode === "INFLOW_ONLY"
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "bg-surface text-foreground/70 border-surface-border hover:bg-surface-hover"
              }`}
            >
              Inflow Only
            </button>
          </div>

          {/* Min Fresh Inflow ₹ Cr */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-foreground/70">Min |1D Net Inflow|:</span>
              <span className="font-mono font-bold text-foreground">
                {minInflow === 0 ? "Any (0 Cr)" : `≥ ₹${minInflow} Cr`}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 25, 40, 75, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMinInflow(val)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition ${
                    minInflow === val
                      ? "bg-foreground text-background font-bold border-foreground"
                      : "bg-surface text-foreground/60 border-surface-border hover:text-foreground"
                  }`}
                >
                  {val === 0 ? "0" : `₹${val}`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={minInflow}
              onChange={(e) => setMinInflow(Number(e.target.value))}
              className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer mt-0.5"
            />
          </div>

          {/* Min |OI Change %| */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-foreground/70">Min |1D OI Change|:</span>
              <span className="font-mono font-bold text-foreground">
                {minOiPct === 0 ? "Any (0%)" : `≥ ${minOiPct}%`}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 2.5, 3.5, 5.0, 8.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMinOiPct(val)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition ${
                    minOiPct === val
                      ? "bg-foreground text-background font-bold border-foreground"
                      : "bg-surface text-foreground/60 border-surface-border hover:text-foreground"
                  }`}
                >
                  {val === 0 ? "0" : `${val}%`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={minOiPct}
              onChange={(e) => setMinOiPct(Number(e.target.value))}
              className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer mt-0.5"
            />
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
};
