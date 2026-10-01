"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useMarketStore } from "@/stores/marketStore";
import { useChartIndicatorStore } from "@/stores/chartIndicatorStore";
import { ThemeToggle } from "./ThemeToggle";
import { UserAuthButton } from "./UserAuthButton";
import { MacroIndicatorPopover } from "@/features/chart/components/MacroIndicatorPopover";
import { DailyMacroIndicatorPopover } from "@/features/chart/components/DailyMacroIndicatorPopover";

interface Props {
  isDark: boolean;
  toggleTheme: () => void;
  breadth?: number;
}

export const AppFooter: React.FC<Props> = ({
  isDark,
  toggleTheme,
  breadth = 0,
}) => {
  const pathname = usePathname();
  const isChartPage = pathname.startsWith("/chart") || pathname.startsWith("/macro");

  const { wsConnected, isLive, selectedInterval } = useMarketStore();
  const { showPoc, showBands, showVwap, togglePoc, toggleBands, toggleVwap } = useChartIndicatorStore();

  const isDaily = selectedInterval === "1d";
  const isStreaming = wsConnected && isLive;
  const statusLabel = isStreaming ? "LIVE" : "SYNCED";
  const isBullish = breadth >= 50;

  return (
    <footer className="h-7 shrink-0 bg-surface/80 backdrop-blur-xs border-t border-surface-border flex items-center justify-between px-3 md:px-4 text-[11px] text-foreground/60 select-none z-20">
      {/* Left: Engine Status & Global VWAP Breadth */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Edge Engine Connection Status */}
        <div className="flex items-center gap-1.5 shrink-0" title={`Gidh Edge Engine: ${statusLabel}`}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isStreaming ? "bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" : "bg-foreground/30"
            }`}
          />
          <span className="font-semibold text-foreground/70 text-[10px] uppercase tracking-wider">
            {statusLabel}
          </span>
        </div>

        <div className="h-3 w-px bg-surface-border shrink-0" />

        {/* VWAP Breadth */}
        <div
          className="flex items-center gap-1.5 shrink-0 font-medium"
          title={`Market Breadth (Universe > VWAP): ${breadth.toFixed(0)}% (${isBullish ? "BULLISH" : "BEARISH"})`}
        >
          <span className="text-[10px] text-foreground/45 uppercase tracking-wider">VWAP</span>
          <span className={`font-bold tabular-nums text-[10px] ${isBullish ? "text-emerald-500" : "text-rose-500"}`}>
            {breadth.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Center: Chart Plugin Toggles (Intraday only) */}
      {isChartPage && !isDaily && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-bold text-foreground/35 uppercase tracking-wider mr-0.5">
            PLUGINS:
          </span>

          {/* POC Toggle */}
          <button
            onClick={togglePoc}
            title="Toggle Dynamic Point of Control (POC)"
            className={`h-5 px-1.5 rounded text-[10px] font-semibold tracking-tight transition flex items-center gap-1 cursor-pointer border ${
              showPoc
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-surface text-foreground/35 border-surface-border hover:text-foreground/60"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showPoc ? "bg-amber-500 shadow-xs shadow-amber-500/50" : "bg-foreground/20"}`} />
            POC
          </button>

          {/* VWAP Bands Toggle */}
          <button
            onClick={toggleBands}
            title="Toggle VWAP ±1σ and ±2σ Standard Deviation Bands"
            className={`h-5 px-1.5 rounded text-[10px] font-semibold tracking-tight transition flex items-center gap-1 cursor-pointer border ${
              showBands
                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25"
                : "bg-surface text-foreground/35 border-surface-border hover:text-foreground/60"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showBands ? "bg-cyan-400 shadow-xs shadow-cyan-500/50" : "bg-foreground/20"}`} />
            BANDS
          </button>

          {/* VWAP Toggle */}
          <button
            onClick={toggleVwap}
            title="Toggle VWAP Anchor Line"
            className={`h-5 px-1.5 rounded text-[10px] font-semibold tracking-tight transition flex items-center gap-1 cursor-pointer border ${
              showVwap
                ? "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25"
                : "bg-surface text-foreground/35 border-surface-border hover:text-foreground/60"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showVwap ? "bg-purple-400 shadow-xs shadow-purple-500/50" : "bg-foreground/20"}`} />
            VWAP
          </button>

          {/* Macro Structural Levels & Shaded Zones Popover Plugin */}
          <MacroIndicatorPopover />
        </div>
      )}

      {/* Right: Theme Toggle + User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        <div className="h-3 w-px bg-surface-border mx-0.5" />
        <UserAuthButton />
      </div>
    </footer>
  );
};
