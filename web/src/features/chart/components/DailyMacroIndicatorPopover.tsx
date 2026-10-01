"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChartIndicatorStore } from "@/stores/chartIndicatorStore";
import {
  ChevronUp,
  X,
  Square,
  CheckSquare,
  Calendar,
  Compass,
} from "lucide-react";

export const DailyMacroIndicatorPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    dailyLookback,
    showDailyPwh,
    showDailyPwl,
    showDailySwings,
    showDailyClv,
    setDailyLookback,
    toggleDailyPwh,
    toggleDailyPwl,
    toggleDailySwings,
    toggleDailyClv,
    setDailyPwh,
    setDailyPwl,
    setDailySwings,
    setDailyClv,
  } = useChartIndicatorStore();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const activeCount = [
    showDailyPwh,
    showDailyPwl,
    showDailySwings,
    showDailyClv,
  ].filter(Boolean).length;

  const handleSelectAll = () => {
    setDailyPwh(true);
    setDailyPwl(true);
    setDailySwings(true);
    setDailyClv(true);
  };

  const handleClearAll = () => {
    setDailyPwh(false);
    setDailyPwl(false);
    setDailySwings(false);
    setDailyClv(false);
  };

  return (
    <div className="relative inline-block select-none" ref={popoverRef}>
      {/* Footer Plugin Trigger for Daily Macro */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Configure 52-Week / 120-Day Daily Macro Lookback & Structural Indicators"
        className={`h-5 px-1.5 rounded text-[10px] font-semibold tracking-tight transition flex items-center gap-1 cursor-pointer border ${
          activeCount > 0
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
            : "bg-surface text-foreground/35 border-surface-border hover:text-foreground/60"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            activeCount > 0
              ? "bg-amber-400 shadow-xs shadow-amber-500/50"
              : "bg-foreground/20"
          }`}
        />
        <span>MACRO (52W)</span>
        <span className="text-[9px] font-mono opacity-80">
          {dailyLookback}D ({activeCount}/4)
        </span>
        <ChevronUp
          className={`w-2.5 h-2.5 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-foreground" : "text-foreground/40"
          }`}
        />
      </button>

      {/* Floating Popover Menu (Opens Above the Footer) */}
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-76 bg-surface/95 border border-surface-border rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-500" />
              <span className="font-extrabold text-foreground text-xs">
                Daily Macro Lookback & Plugins
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-muted cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lookback Session Window Picker (30d, 90d, 120d, 250d / 52w) */}
          <div className="flex flex-col gap-1 px-2.5 py-1.5 rounded-lg bg-surface-muted/60 border border-surface-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500" />
                Historical Lookback Horizon:
              </span>
              <span className="font-mono font-bold text-amber-400 text-xs">
                {dailyLookback} Sessions
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {[
                { label: "30D", val: 30 },
                { label: "90D", val: 90 },
                { label: "120D", val: 120 },
                { label: "52W (250D)", val: 250 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setDailyLookback(opt.val)}
                  className={`py-1 rounded text-[10px] font-bold transition cursor-pointer border ${
                    dailyLookback === opt.val
                      ? "bg-amber-500 text-black border-amber-500 shadow-xs font-black"
                      : "bg-surface/50 text-foreground/60 border-surface-border hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Macro Level Selectors for Daily View */}
          <div className="flex flex-col gap-1.5">
            {/* 1. Daily Rolling PWH */}
            <button
              type="button"
              onClick={toggleDailyPwh}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showDailyPwh
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showDailyPwh ? (
                  <CheckSquare className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">PWH 5-Day Curve</span>
                  <span className="text-[10px] text-foreground/40">
                    Prior Week High Dynamic Line
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-rose-400 font-bold">
                Red
              </span>
            </button>

            {/* 2. Daily Rolling PWL */}
            <button
              type="button"
              onClick={toggleDailyPwl}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showDailyPwl
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showDailyPwl ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">PWL 5-Day Curve</span>
                  <span className="text-[10px] text-foreground/40">
                    Prior Week Low Dynamic Line
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Green
              </span>
            </button>

            {/* 3. Structural Swing Highs & Lows (HH, LH, HL, LL) */}
            <button
              type="button"
              onClick={toggleDailySwings}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showDailySwings
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showDailySwings ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">Multi-Month Swings</span>
                  <span className="text-[10px] text-foreground/40">
                    Structural Pivots (HH, LH, HL, LL)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                Pivots
              </span>
            </button>

            {/* 4. CLV Daily Order Block Identification */}
            <button
              type="button"
              onClick={toggleDailyClv}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showDailyClv
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showDailyClv ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">CLV Order Blocks</span>
                  <span className="text-[10px] text-foreground/40">
                    Institutional Rejection / Defense Bars
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold">
                CLV |±0.60|
              </span>
            </button>
          </div>

          {/* Footer Quick Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-surface-border/60 text-[10px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-amber-500 hover:underline font-bold cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-foreground/40 hover:text-foreground cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
