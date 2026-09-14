"use client";

import React from "react";
import { Search } from "lucide-react";

interface Props {
  search: string;
  setSearch: (val: string) => void;
  visibleCount: number;
  totalCount: number;
}

export const SectorFilterBar: React.FC<Props> = ({
  search,
  setSearch,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-xs select-none">
      <div className="relative min-w-[240px]">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          type="text"
          placeholder="Filter battalion by name or stock..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-muted border border-surface-border rounded pl-8 pr-2.5 py-1 text-xs text-foreground placeholder-foreground/40 focus:outline-none focus:border-foreground/40"
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <span>Showing</span>
        <span className="font-bold text-foreground">{visibleCount}</span>
        <span>/ {totalCount} Sector Battalions</span>
      </div>
    </div>
  );
};
