"use client";

import React from "react";
import { Search, Layers, Compass, Globe, Sparkles } from "lucide-react";
import { IndexCategoryFilter } from "../types";

interface Props {
  category: IndexCategoryFilter;
  setCategory: (c: IndexCategoryFilter) => void;
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  onRefresh: () => void;
  visibleCount: number;
  totalCount: number;
}

const CATEGORIES: { id: IndexCategoryFilter; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "ALL", label: "All", icon: Layers },
  { id: "BENCHMARK", label: "Benchmarks", icon: Compass },
  { id: "SECTOR", label: "Sectors", icon: Sparkles },
  { id: "SPECIAL", label: "Global / Volatility", icon: Globe },
];

export const IndicesFilterBar: React.FC<Props> = ({
  category,
  setCategory,
  search,
  setSearch,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="flex flex-col gap-2 py-1 text-xs select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Category Tabs (matching RadarFilterBar preset tabs) */}
          <div className="flex items-center border-b border-surface-border gap-1 mr-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 transition text-xs flex items-center gap-1.5 cursor-pointer shrink-0 border-b-2 -mb-px font-medium ${
                    isActive
                      ? "border-foreground text-foreground font-bold"
                      : "border-transparent text-foreground/50 hover:text-foreground hover:border-surface-border"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-foreground" : "text-foreground/40"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="hidden md:block relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search index or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-background pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground/60 transition"
            />
          </div>
        </div>

        {/* Showing Count */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/50 pr-1 shrink-0">
          <span>Showing</span>
          <span className="font-bold text-foreground">{visibleCount}</span>
          <span>/ {totalCount} Indices</span>
        </div>
      </div>

      {/* Mobile Search Input */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search index..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground"
          />
        </div>
        <div className="text-[11px] text-foreground/50 shrink-0 px-1">
          <span className="font-bold text-foreground">{visibleCount}</span>/{totalCount}
        </div>
      </div>
    </div>
  );
};
