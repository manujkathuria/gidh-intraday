"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChartIndicatorStore } from "@/stores/chartIndicatorStore";
import { MacroLevelsData } from "@/lib/api_quant";
import {
  Layers,
  ChevronUp,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  Square,
  CheckSquare,
} from "lucide-react";

interface Props {
  macroLevels?: MacroLevelsData | null;
}

export const MacroIndicatorPopover: React.FC<Props> = ({ macroLevels }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    showMacroLevels,
    showPwhPwl,
    showPdhPdl,
    showSwingPivots,
    showClvZones,
    toggleMacroLevels,
    togglePwhPwl,
    togglePdhPdl,
    toggleSwingPivots,
    toggleClvZones,
    setMacroLevels,
    setPwhPwl,
    setPdhPdl,
    setSwingPivots,
    setClvZones,
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
    showPwhPwl,
    showPdhPdl,
    showSwingPivots,
    showClvZones,
  ].filter(Boolean).length;

  const handleSelectAll = () => {
    setMacroLevels(true);
    setPwhPwl(true);
    setPdhPdl(true);
    setSwingPivots(true);
    setClvZones(true);
  };

  const handleClearAll = () => {
    setPwhPwl(false);
    setPdhPdl(false);
    setSwingPivots(false);
    setClvZones(false);
  };

  return (
    <div className="relative inline-block select-none" ref={popoverRef}>
      {/* Footer Plugin Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Configure Macro Structural Levels & Shaded Zones"
        className={`h-5 px-1.5 rounded text-[10px] font-semibold tracking-tight transition flex items-center gap-1 cursor-pointer border ${
          showMacroLevels && activeCount > 0
            ? "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
            : "bg-surface text-foreground/35 border-surface-border hover:text-foreground/60"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            showMacroLevels && activeCount > 0
              ? "bg-rose-400 shadow-xs shadow-rose-500/50"
              : "bg-foreground/20"
          }`}
        />
        <span>MACRO</span>
        <span className="text-[9px] font-mono opacity-80">
          {showMacroLevels ? `${activeCount}/4` : "OFF"}
        </span>
        <ChevronUp
          className={`w-2.5 h-2.5 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-foreground" : "text-foreground/40"
          }`}
        />
      </button>

      {/* Floating Popover Menu (Opens Above the Footer) */}
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-surface/95 border border-surface-border rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" />
              <span className="font-extrabold text-foreground text-xs">
                Macro Structural Levels
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

          {/* Master Switch */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-muted/60 border border-surface-border/40">
            <span className="text-xs font-bold text-foreground">
              Master Overlay Toggle
            </span>
            <button
              type="button"
              onClick={toggleMacroLevels}
              className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer ${
                showMacroLevels ? "bg-amber-500" : "bg-surface-border"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  showMacroLevels ? "left-4" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Granular Level Selectors */}
          <div
            className={`flex flex-col gap-1.5 transition-opacity ${
              showMacroLevels ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            {/* 1. PWH / PWL */}
            <button
              type="button"
              onClick={togglePwhPwl}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showPwhPwl
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showPwhPwl ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">PWH & PWL</span>
                  <span className="text-[10px] text-foreground/40">
                    Prior 5-Day High & Low
                  </span>
                </div>
              </div>
              {macroLevels && (
                <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                  {macroLevels.pwh && (
                    <span className="text-rose-400 font-bold">
                      H: ₹{macroLevels.pwh.toFixed(1)}
                    </span>
                  )}
                  {macroLevels.pwl && (
                    <span className="text-emerald-400 font-bold">
                      L: ₹{macroLevels.pwl.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 2. PDH / PDL */}
            <button
              type="button"
              onClick={togglePdhPdl}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showPdhPdl
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showPdhPdl ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">PDH & PDL</span>
                  <span className="text-[10px] text-foreground/40">
                    Prior Day High & Low
                  </span>
                </div>
              </div>
              {macroLevels && (
                <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                  {macroLevels.pdh && (
                    <span className="text-orange-400 font-bold">
                      H: ₹{macroLevels.pdh.toFixed(1)}
                    </span>
                  )}
                  {macroLevels.pdl && (
                    <span className="text-sky-400 font-bold">
                      L: ₹{macroLevels.pdl.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 3. Swing RES / SUP */}
            <button
              type="button"
              onClick={toggleSwingPivots}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showSwingPivots
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showSwingPivots ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">Swing RES / SUP</span>
                  <span className="text-[10px] text-foreground/40">
                    Order 3 Fractal Pivots
                  </span>
                </div>
              </div>
              {macroLevels && (
                <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                  {macroLevels.swing_res && (
                    <span className="text-rose-400 font-bold">
                      R: ₹{macroLevels.swing_res.toFixed(1)}
                    </span>
                  )}
                  {macroLevels.swing_sup && (
                    <span className="text-emerald-400 font-bold">
                      S: ₹{macroLevels.swing_sup.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 4. CLV Supply & Demand Zones */}
            <button
              type="button"
              onClick={toggleClvZones}
              className={`flex items-center justify-between p-2 rounded-lg border transition text-left cursor-pointer ${
                showClvZones
                  ? "bg-surface-hover border-surface-border text-foreground"
                  : "bg-surface/40 border-transparent text-foreground/50 hover:bg-surface-hover/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {showClvZones ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-xs">
                    CLV Supply & Demand Zones
                  </span>
                  <span className="text-[10px] text-foreground/40">
                    Shaded Order Block Bands
                  </span>
                </div>
              </div>
              {macroLevels && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                  {(macroLevels.clv_supply_zones?.length || 0) +
                    (macroLevels.clv_demand_zones?.length || 0)}{" "}
                  Zones
                </span>
              )}
            </button>
          </div>

          {/* Bottom Quick Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-surface-border/40 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-foreground/60 hover:text-foreground font-semibold cursor-pointer transition"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-foreground/40 hover:text-foreground font-semibold cursor-pointer transition"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
