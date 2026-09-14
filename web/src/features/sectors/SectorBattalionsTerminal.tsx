"use client";

import React from "react";
import { SectorFilterBar } from "./components/SectorFilterBar";
import { SectorTableHeader } from "./components/SectorTableHeader";
import { SectorFormationRow } from "./components/SectorFormationRow";
import { useSectorFormations } from "./hooks/useSectorFormations";

export const SectorBattalionsTerminal: React.FC = () => {
  const {
    sectors,
    sortedSectors,
    sortField,
    sortAsc,
    handleSort,
    search,
    setSearch,
    expandedSector,
    toggleExpand,
  } = useSectorFormations();

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* 1. Filter Bar */}
      <SectorFilterBar
        search={search}
        setSearch={setSearch}
        visibleCount={sortedSectors.length}
        totalCount={sectors.length}
      />

      {/* 2. Sector Formation Data Table */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <SectorTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
            <tbody>
              {sortedSectors.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-foreground/40 font-mono text-xs"
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
