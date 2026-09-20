"use client";

import React from "react";
import { Search, Layers, TrendingUp, TrendingDown, ChevronsUpDown, Check } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
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
    { id: "ALL", label: "All Sectors", icon: Layers },
    { id: "LEADERS", label: "Bulls", icon: TrendingUp },
    { id: "LAGGARDS", label: "Bears", icon: TrendingDown },
  ];

  const currentPreset = presets.find((p) => p.id === preset) || presets[0];
  const CurrentIcon = currentPreset.icon;

  return (
    <div className="flex flex-col gap-2 py-1 text-xs select-none">
      {/* Top Row: Presets + Search (Desktop) + Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile Preset Dropdown (< md) */}
          <div className="md:hidden flex-1 max-w-[150px]">
            <Listbox value={preset} onChange={setPreset}>
              <div className="relative text-xs">
                <ListboxButton className="flex items-center justify-between w-full cursor-pointer rounded-md bg-surface px-2.5 py-1.5 text-left text-foreground border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground transition">
                  <div className="flex items-center gap-1.5 truncate">
                    <CurrentIcon className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                    <span className="font-bold truncate">{currentPreset.label}</span>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 ml-1" />
                </ListboxButton>
                <ListboxOptions
                  transition
                  className="absolute z-50 mt-1 min-w-[150px] rounded-lg bg-surface border border-surface-border py-1 text-xs shadow-2xl outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
                >
                  {presets.map((p) => {
                    const Icon = p.icon;
                    return (
                      <ListboxOption
                        key={p.id}
                        value={p.id}
                        className="group relative cursor-pointer py-2 pr-7 pl-3 text-foreground/80 select-none data-focus:bg-foreground data-focus:text-background transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 opacity-70 group-data-focus:opacity-100" />
                          <span className="font-semibold group-data-selected:font-black">
                            {p.label}
                          </span>
                        </div>
                        <Check className="w-3.5 h-3.5 text-foreground group-not-data-selected:hidden group-data-focus:text-background" />
                      </ListboxOption>
                    );
                  })}
                </ListboxOptions>
              </div>
            </Listbox>
          </div>

          {/* Desktop Filter Tabs (Institutional Clean) */}
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

          {/* Desktop Search Input (md+) */}
          <div className="hidden md:block relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sector or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground/60 transition"
            />
          </div>
        </div>

        {/* Desktop Showing Count (md+) */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/50 pr-1 shrink-0">
          <span>Showing</span>
          <span className="font-bold text-foreground">{visibleCount}</span>
          <span>/ {totalCount} Sectors</span>
        </div>
      </div>

      {/* Mobile Search & Count Row (< md) */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sector or constituent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
          />
        </div>
        <div className="text-[11px] text-foreground/50 shrink-0  px-1">
          <span className="font-bold text-foreground">{visibleCount}</span>/{totalCount}
        </div>
      </div>
    </div>
  );
};
