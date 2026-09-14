"use client";

import React from "react";
import { Search, Layers, TrendingUp, TrendingDown, Flame } from "lucide-react";
import { SectorPreset } from "../types";

interface Props {
  preset: SectorPreset;
  setPreset: (preset: SectorPreset) => void;
  search: string;
  setSearch: (val: string) => void;
  visibleCount: number;
  totalCount: number;
}

export const SectorFilterBar: React.FC<Props> = ({
  preset,
  setPreset,
  search,
  setSearch,
  visibleCount,
  totalCount,
}) => {
  const presets: { id: SectorPreset; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "ALL", label: `All Sectors (${totalCount})`, icon: Layers },
    { id: "LEADERS", label: "Top Bulls", icon: TrendingUp },
    { id: "SURGES", label: "Volume Surges (≥1.8x)", icon: Flame },
    { id: "LAGGARDS", label: "Top Bears", icon: TrendingDown },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1 text-xs select-none">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 1-Click Spectator Presets */}
        <div className="flex items-center bg-surface-muted border border-surface-border rounded-md p-1">
          {presets.map((p) => {
            const Icon = p.icon;
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 rounded transition font-bold flex items-center gap-1.5 ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tailwind Plus Style Precision Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sector or constituent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
          />
        </div>
      </div>

      {/* Showing Count */}
      <div className="flex items-center gap-1.5 text-xs text-foreground/50 pr-1">
        <span>Showing</span>
        <span className="font-bold text-foreground">{visibleCount}</span>
        <span>/ {totalCount} Sectors</span>
      </div>
    </div>
  );
};
