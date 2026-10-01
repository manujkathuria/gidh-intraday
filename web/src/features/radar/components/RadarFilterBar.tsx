"use client";

import React from "react";
import { Search, Layers, Zap, SlidersHorizontal, Check } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { RadarPreset, VwapFilter } from "../types";
import { RadarPresetMobileListbox } from "./RadarPresetMobileListbox";

interface Props {
  preset: RadarPreset;
  setPreset: (preset: RadarPreset) => void;
  vwapFilter: VwapFilter;
  setVwapFilter: (filter: VwapFilter) => void;
  search: string;
  setSearch: (val: string) => void;
  visibleCount: number;
  totalCount: number;
}

const vwapOptions: { id: VwapFilter; label: string }[] = [
  { id: "ALL", label: "All Bands" },
  { id: "NEAR_VWAP", label: "Near VWAP (±0.5σ)" },
  { id: "ABOVE_1S", label: "> +1σ" },
  { id: "ABOVE_2S", label: "> +2σ" },
  { id: "BELOW_1S", label: "< -1σ" },
  { id: "BELOW_2S", label: "< -2σ" },
];

export const RadarFilterBar: React.FC<Props> = ({
  preset,
  setPreset,
  vwapFilter,
  setVwapFilter,
  search,
  setSearch,
  visibleCount,
  totalCount,
}) => {
  const presets: { id: RadarPreset; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "ALL", label: "All", icon: Layers },
    { id: "SURGES", label: "Surges", icon: Zap },
  ];

  const currentVwap = vwapOptions.find((v) => v.id === vwapFilter) || vwapOptions[0];

  return (
    <div className="flex flex-col gap-2 py-1 text-xs select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile Tab Listbox */}
          <RadarPresetMobileListbox preset={preset} setPreset={setPreset} presets={presets} />

          {/* Desktop Tab Selector */}
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

          {/* VWAP Band Filter Dropdown (Clean & Minimal) */}
          <div className="relative min-w-[130px]">
            <Listbox value={vwapFilter} onChange={setVwapFilter}>
              <ListboxButton className="flex items-center justify-between w-full cursor-pointer rounded-md bg-background px-2.5 py-1.5 text-left text-foreground border border-surface-border hover:border-foreground/40 transition">
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${vwapFilter !== "ALL" ? "text-foreground" : "text-foreground/40"}`} />
                  <span className={`truncate text-xs ${vwapFilter !== "ALL" ? "font-bold text-foreground" : "text-foreground/70"}`}>
                    {currentVwap.label}
                  </span>
                </div>
              </ListboxButton>
              <ListboxOptions
                transition
                className="absolute z-50 mt-1 min-w-[160px] rounded-lg bg-surface border border-surface-border py-1 text-xs shadow-2xl outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
              >
                {vwapOptions.map((opt) => (
                  <ListboxOption
                    key={opt.id}
                    value={opt.id}
                    className="group relative cursor-pointer py-1.5 pr-7 pl-3 text-foreground/80 select-none data-focus:bg-foreground data-focus:text-background transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold group-data-selected:font-bold">{opt.label}</span>
                    <Check className="w-3.5 h-3.5 text-foreground group-not-data-selected:hidden group-data-focus:text-background" />
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>

          {/* Desktop Search Input */}
          <div className="hidden md:block relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground/60 transition"
            />
          </div>
        </div>

        {/* Counter */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/50 pr-1 shrink-0">
          <span>Showing</span>
          <span className="font-bold text-foreground">{visibleCount}</span>
          <span>/ {totalCount} Stocks</span>
        </div>
      </div>

      {/* Mobile Search Bar (< md) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground transition"
          />
        </div>
        <div className="text-[11px] text-foreground/50 shrink-0">
          <span className="font-bold text-foreground">{visibleCount}</span>/{totalCount}
        </div>
      </div>
    </div>
  );
};
