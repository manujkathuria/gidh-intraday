"use client";

import React from "react";
import { Search } from "lucide-react";
import { SectorOption, VwapFilter } from "../types";

interface Props {
  search: string;
  setSearch: (val: string) => void;
  selectedSector: string;
  setSelectedSector: (val: string) => void;
  sectorOptions: SectorOption[];
  minRvol: number;
  setMinRvol: (val: number) => void;
  vwapFilter: VwapFilter;
  setVwapFilter: (val: VwapFilter) => void;
  visibleCount: number;
  totalCount: number;
}

export const RadarFilterBar: React.FC<Props> = ({
  search,
  setSearch,
  selectedSector,
  setSelectedSector,
  sectorOptions,
  minRvol,
  setMinRvol,
  vwapFilter,
  setVwapFilter,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs select-none">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            placeholder="Search stock or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-muted border border-surface-border rounded pl-8 pr-2.5 py-1 text-xs text-foreground placeholder-foreground/40 focus:outline-none focus:border-foreground/40"
          />
        </div>

        {/* Sector Dropdown */}
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="bg-surface-muted border border-surface-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none cursor-pointer"
        >
          {sectorOptions.map((opt) => (
            <option key={opt.sector} value={opt.sector} className="bg-surface text-foreground">
              {opt.label}
            </option>
          ))}
        </select>

        {/* Min RVOL Buttons */}
        <div className="flex items-center gap-1 bg-surface-muted border border-surface-border rounded p-0.5">
          <span className="text-[10px] text-foreground/40 px-1.5 font-bold">RVOL:</span>
          {[0, 1.5, 3.0, 5.0, 10.0].map((val) => (
            <button
              key={val}
              onClick={() => setMinRvol(val)}
              className={`px-2 py-0.5 text-xs rounded transition ${
                minRvol === val
                  ? "bg-foreground text-background font-bold"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {val === 0 ? "All" : `≥${val}x`}
            </button>
          ))}
        </div>

        {/* VWAP Alignment Buttons */}
        <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5">
          {(["ALL", "ABOVE", "BELOW"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setVwapFilter(filter)}
              className={`px-2 py-0.5 text-xs rounded transition ${
                vwapFilter === filter
                  ? "bg-foreground text-background font-bold"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {filter === "ALL" ? "All" : filter === "ABOVE" ? "▲ Bulls" : "▼ Bears"}
            </button>
          ))}
        </div>
      </div>

      {/* Showing Count */}
      <div className="flex items-center gap-1.5 text-xs text-foreground/50 font-mono">
        <span>Showing</span>
        <span className="font-bold text-foreground">{visibleCount}</span>
        <span>/ {totalCount} Stocks</span>
      </div>
    </div>
  );
};
