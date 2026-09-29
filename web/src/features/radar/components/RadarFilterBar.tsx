"use client";

import React from "react";
import { Search, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { RadarPreset, SectorOption } from "../types";
import { SectorListbox } from "./SectorListbox";
import { RadarPresetMobileListbox } from "./RadarPresetMobileListbox";

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
    { id: "LEADERS", label: "Bulls", icon: TrendingUp },
    { id: "DUMPERS", label: "Bears", icon: TrendingDown },
  ];

  return (
    <div className="flex flex-col gap-2 py-1 text-xs select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <RadarPresetMobileListbox preset={preset} setPreset={setPreset} presets={presets} />

          <div className="hidden md:flex items-center border-b border-surface-border gap-1 mr-2">
            {presets.map((p) => {
              const Icon = p.icon;
              const isActive = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 transition text-xs flex items-center gap-1.5 cursor-pointer shrink-0 border-b-2 -mb-px font-medium ${
                    isActive
                      ? "border-foreground text-foreground font-bold"
                      : "border-transparent text-foreground/50 hover:text-foreground hover:border-surface-border"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-foreground" : "text-foreground/40"}`} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 md:flex-initial">
            <SectorListbox
              selectedSector={selectedSector}
              setSelectedSector={setSelectedSector}
              sectorOptions={sectorOptions}
            />
          </div>

          <div className="hidden md:block relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search symbol or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground/60 transition"
            />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/50 pr-1 shrink-0">
          <span>Showing</span>
          <span className="font-bold text-foreground">{visibleCount}</span>
          <span>/ {totalCount} Stocks</span>
        </div>
      </div>

      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search symbol or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
          />
        </div>
        <div className="text-[11px] text-foreground/50 shrink-0 px-1">
          <span className="font-bold text-foreground">{visibleCount}</span>/{totalCount}
        </div>
      </div>
    </div>
  );
};
