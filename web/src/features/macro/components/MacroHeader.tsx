"use client";

import React from "react";
import { Layers, TrendingDown, TrendingUp } from "lucide-react";
import { MacroTab, MacroRunResponse } from "../types";

interface Props {
  runData: MacroRunResponse | null;
  activeTab: MacroTab;
  onSelectTab: (tab: MacroTab) => void;
}

export const MacroHeader: React.FC<Props> = ({
  runData,
  activeTab,
  onSelectTab,
}) => {
  const shortsCount = runData?.shorts?.length ?? 0;
  const longsCount = runData?.longs?.length ?? 0;

  return (
    <div className="flex flex-col gap-2.5 bg-surface border border-surface-border rounded-lg p-3 md:p-3.5">
      {/* Top Title & Strategy Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-wide text-foreground">
              Macro Hunter
            </h1>
            <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-semibold">
              RVOL + PDH/PDL (09:45 AM Snapshot)
            </span>
          </div>
          <span className="text-xs text-foreground/50 mt-0.5">
            Institutional distribution & accumulation footprint evaluated at the 30-minute opening range
          </span>
        </div>

        {/* 3-Slot Portfolio Rule Callout */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/60 bg-surface-hover/50 px-2.5 py-1 rounded border border-surface-border/40 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Portfolio Cap: Max 3 Active Slots</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 border-t border-surface-border/40 pt-2 mt-0.5 flex-wrap">
        <button
          onClick={() => onSelectTab("ALL")}
          className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
            activeTab === "ALL"
              ? "bg-foreground text-background font-bold shadow"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          All Candidates ({shortsCount + longsCount})
        </button>

        <button
          onClick={() => onSelectTab("SHORTS")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
            activeTab === "SHORTS"
              ? "bg-rose-500 text-white font-bold shadow"
              : "text-rose-400/70 hover:text-rose-400"
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Grade A Shorts ({shortsCount})</span>
        </button>

        <button
          onClick={() => onSelectTab("LONGS")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
            activeTab === "LONGS"
              ? "bg-emerald-500 text-white font-bold shadow"
              : "text-emerald-400/70 hover:text-emerald-400"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Grade A Longs ({longsCount})</span>
        </button>
      </div>
    </div>
  );
};
