"use client";

import React from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

interface Props {
  minInflow: number;
  setMinInflow: (val: number) => void;
  minOiPct: number;
  setMinOiPct: (val: number) => void;
  minPricePct: number;
  setMinPricePct: (val: number) => void;
  minPrice: number;
  maxPrice: number;
  setPriceRange: (min: number, max: number) => void;
}

export const MacroFilterPopover: React.FC<Props> = ({
  minInflow,
  setMinInflow,
  minOiPct,
  setMinOiPct,
  minPricePct,
  setMinPricePct,
  minPrice,
  maxPrice,
  setPriceRange,
}) => {
  const isCustomized = minInflow !== 50 || minOiPct !== 5.0 || minPricePct !== 0.75 || minPrice !== 300 || maxPrice !== 5000;

  const handleReset = () => {
    setMinInflow(50);
    setMinOiPct(5.0);
    setMinPricePct(0.75);
    setPriceRange(300, 5000);
  };

  return (
    <Popover className="relative select-none text-xs">
      <PopoverButton className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface text-foreground/80 hover:text-foreground hover:bg-surface-hover border border-surface-border cursor-pointer transition focus:outline-none">
        <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/50" />
        <span className="font-semibold text-xs tracking-wide">
          Filters
        </span>
        {isCustomized && (
          <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        transition
        className="z-50 mt-1.5 w-72 rounded-xl bg-surface border border-surface-border p-3.5 shadow-2xl transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 focus:outline-none flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <span className="font-bold text-xs text-foreground uppercase tracking-wider">
            Macro Thresholds
          </span>
          {isCustomized && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] font-bold text-foreground/50 hover:text-foreground flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* 1. Min 1D Rupee Inflow */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-foreground/70">Min 1D Inflow:</span>
            <span className="font-mono font-bold text-foreground">₹{minInflow} Cr</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={minInflow}
            onChange={(e) => setMinInflow(Number(e.target.value))}
            className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
          />
        </div>

        {/* 2. Min 1D OI % Change */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-foreground/70">Min 1D OI Change:</span>
            <span className="font-mono font-bold text-foreground">+{minOiPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={minOiPct}
            onChange={(e) => setMinOiPct(Number(e.target.value))}
            className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
          />
        </div>

        {/* 3. Min Price Move % */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-foreground/70">Min Price Move:</span>
            <span className="font-mono font-bold text-foreground">±{minPricePct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.25"
            value={minPricePct}
            onChange={(e) => setMinPricePct(Number(e.target.value))}
            className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
          />
        </div>

        {/* 4. Min Price Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-foreground/70">Min Price:</span>
            <span className="font-mono font-bold text-foreground">₹{minPrice}</span>
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

        {/* 5. Max Price Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-foreground/70">Max Price:</span>
            <span className="font-mono font-bold text-foreground">
              {maxPrice >= 10000 ? "No Cap" : `₹${maxPrice}`}
            </span>
          </div>
          <input
            type="range"
            min="500"
            max="10000"
            step="250"
            value={maxPrice}
            onChange={(e) => setPriceRange(minPrice, Number(e.target.value))}
            className="w-full accent-foreground h-1 bg-surface-border rounded cursor-pointer"
          />
        </div>
      </PopoverPanel>
    </Popover>
  );
};
