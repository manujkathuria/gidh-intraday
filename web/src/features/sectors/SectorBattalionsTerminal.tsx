"use client";

import React from "react";
import { SectorFilterBar } from "./components/SectorFilterBar";
import { SectorTableHeader } from "./components/SectorTableHeader";
import { SectorFormationRow } from "./components/SectorFormationRow";
import { SectorMobileCard } from "./components/SectorMobileCard";
import { useSectorFormations } from "./hooks/useSectorFormations";

export const SectorBattalionsTerminal: React.FC = () => {
  const {
    sectors,
    sortedSectors,
    preset,
    setPreset,
    sortField,
    sortAsc,
    handleSort,
    search,
    setSearch,
    expandedSector,
    toggleExpand,
  } = useSectorFormations();

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Filter Bar with Spectator Presets */}
      <SectorFilterBar
        preset={preset}
        setPreset={setPreset}
        search={search}
        setSearch={setSearch}
        visibleCount={sortedSectors.length}
        totalCount={sectors.length}
      />

      {/* 2. Mobile View: Flat Expandable Sector List (< md) */}
      <div className="md:hidden flex flex-col divide-y divide-surface-border/40">
        {sortedSectors.length === 0 ? (
          <div className="py-12 text-center text-foreground/40 text-xs">
            No sector battalions match the filter.
          </div>
        ) : (
          sortedSectors.map((sector) => (
            <SectorMobileCard
              key={sector.sector}
              sector={sector}
              isExpanded={expandedSector === sector.sector}
              onToggleExpand={() => toggleExpand(sector.sector)}
            />
          ))
        )}
      </div>

      {/* 3. iPad / Desktop View: High-Density Flat Table (hidden on mobile, visible md+) */}
      <div className="hidden md:block w-full">
        <div className="overflow-x-auto max-h-[calc(100vh-120px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <SectorTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
            <tbody className="divide-y divide-surface-border/30">
              {sortedSectors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-foreground/40 text-xs"
                  >
                    No sector battalions match the filter.
                  </td>
                </tr>
              ) : (
                sortedSectors.map((sector) => (
                  <SectorFormationRow
                    key={sector.sector}
                    sector={sector}
                    isExpanded={expandedSector === sector.sector}
                    onToggleExpand={() => toggleExpand(sector.sector)}
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
