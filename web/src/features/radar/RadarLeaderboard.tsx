"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RadarFilterBar } from "./components/RadarFilterBar";
import { RadarTableHeader } from "./components/RadarTableHeader";
import { RadarTableRow } from "./components/RadarTableRow";
import { RadarMobileCard } from "./components/RadarMobileCard";
import { useRadarFilters } from "./hooks/useRadarFilters";

export const RadarLeaderboard: React.FC = () => {
  const router = useRouter();
  const {
    stocks,
    preset,
    setPreset,
    selectedSector,
    setSelectedSector,
    search,
    setSearch,
    sortField,
    sortAsc,
    handleSort,
    selectedSymbol,
    setSelectedSymbol,
    sectorOptions,
    filteredAndSorted,
  } = useRadarFilters();

  const handleStockClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    router.push(`/chart?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. 1-Click Spectator Filter Presets */}
      <RadarFilterBar
        preset={preset}
        setPreset={setPreset}
        selectedSector={selectedSector}
        setSelectedSector={setSelectedSector}
        sectorOptions={sectorOptions}
        search={search}
        setSearch={setSearch}
        visibleCount={filteredAndSorted.length}
        totalCount={stocks.length}
      />

      {/* 2. Mobile View: Thumb-Friendly Spectator Stock Cards (< md) */}
      <div className="md:hidden bg-surface border border-surface-border rounded-lg overflow-hidden flex flex-col divide-y divide-surface-border">
        {filteredAndSorted.length === 0 ? (
          <div className="py-12 text-center text-foreground/40 text-xs">
            No stocks match this filter.
          </div>
        ) : (
          filteredAndSorted.map((stock, idx) => (
            <RadarMobileCard
              key={stock.symbol}
              stock={stock}
              index={idx}
              isSelected={stock.symbol === selectedSymbol}
              onSelect={handleStockClick}
            />
          ))
        )}
      </div>

      {/* 3. iPad / Desktop View: High-Density Table (hidden on mobile, visible md+) */}
      <div className="hidden md:block bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-130px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <RadarTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-foreground/40 text-xs"
                  >
                    No stocks match this filter.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((stock, idx) => (
                  <RadarTableRow
                    key={stock.symbol}
                    stock={stock}
                    index={idx}
                    isSelected={stock.symbol === selectedSymbol}
                    onSelect={handleStockClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
