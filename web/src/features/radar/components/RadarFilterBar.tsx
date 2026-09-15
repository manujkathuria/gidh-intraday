"use client";

import React from "react";
import { Search, Flame, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { RadarPreset, SectorOption } from "../types";
import { SectorListbox } from "./SectorListbox";

interface Props {
  preset: RadarPreset;
  setPreset: (preset: RadarPreset) => void;
  selectedSector: string;
  setSelectedSector: (val: string) => void;
  sectorOptions: SectorOption[];
  search: string;
  setSearch: (val: string) => void;
  visibleCount: number;
  totalCount: number;
}

export const RadarFilterBar: React.FC<Props> = ({
  preset,
  setPreset,
  selectedSector,
  setSelectedSector,
  sectorOptions,
  search,
  setSearch,
  visibleCount,
  totalCount,
}) => {
  const presets: { id: RadarPreset; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "ALL", label: "All", icon: Layers },
    { id: "SURGES", label: "RVOL", icon: Flame },
    { id: "LEADERS", label: "Bulls", icon: TrendingUp },
    { id: "DUMPERS", label: "Bears", icon: TrendingDown },
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

        {/* Headless UI Custom Select Listbox */}
        <SectorListbox
          selectedSector={selectedSector}
          setSelectedSector={setSelectedSector}
          sectorOptions={sectorOptions}
        />

        {/* Tailwind Plus Style Precision Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search symbol or sector..."
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
        <span>/ {totalCount} Stocks</span>
      </div>
    </div>
  );
};
