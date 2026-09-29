"use client";

import React from "react";
import { Search, RefreshCw } from "lucide-react";

interface Props {
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  onRefresh: () => void;
  visibleCount: number;
  totalCount: number;
}

export const FuturesFilterBar: React.FC<Props> = ({
  search,
  setSearch,
  loading,
  onRefresh,
  visibleCount,
  totalCount,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-xs select-none">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search symbol or contract..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground transition"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface text-foreground font-semibold border border-surface-border hover:bg-surface-hover cursor-pointer transition disabled:opacity-50 shrink-0 text-xs"
          title="Refresh futures dynamics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-foreground" : "text-foreground/50"}`} />
          <span>Refresh</span>
        </button>

        {/* Counter */}
        <div className="text-xs text-foreground/50 shrink-0">
          <span className="font-bold text-foreground">{visibleCount}</span> / {totalCount} Contracts
        </div>
      </div>
    </div>
  );
};
