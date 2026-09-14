"use client";

import React from "react";
import { RadarFilterBar } from "./components/RadarFilterBar";
import { RadarTableHeader } from "./components/RadarTableHeader";
import { RadarTableRow } from "./components/RadarTableRow";
import { useRadarFilters } from "./hooks/useRadarFilters";

export const RadarLeaderboard: React.FC = () => {
  const {
    stocks,
    selectedSector,
    setSelectedSector,
    minRvol,
    setMinRvol,
    vwapFilter,
    setVwapFilter,
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

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* 1. Filter Bar */}
      <RadarFilterBar
        search={search}
        setSearch={setSearch}
        selectedSector={selectedSector}
        setSelectedSector={setSelectedSector}
        sectorOptions={sectorOptions}
        minRvol={minRvol}
        setMinRvol={setMinRvol}
        vwapFilter={vwapFilter}
        setVwapFilter={setVwapFilter}
        visibleCount={filteredAndSorted.length}
        totalCount={stocks.length}
      />

      {/* 2. Clinical Monochrome Data Table */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-140px)] custom-scrollbar">
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
                    colSpan={9}
                    className="py-12 text-center text-foreground/40 font-mono text-xs"
                  >
                    No stocks match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((stock, idx) => (
                  <RadarTableRow
                    key={stock.symbol}
                    stock={stock}
                    index={idx}
                    isSelected={stock.symbol === selectedSymbol}
                    onSelect={setSelectedSymbol}
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
