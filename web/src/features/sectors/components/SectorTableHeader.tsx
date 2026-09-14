"use client";

import React from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { SectorSortField } from "../types";

interface Props {
  sortField: SectorSortField;
  sortAsc: boolean;
  onSort: (field: SectorSortField) => void;
}

export const SectorTableHeader: React.FC<Props> = ({
  sortField,
  sortAsc,
  onSort,
}) => {
  const renderSortIcon = (field: SectorSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-foreground/20 group-hover:text-foreground/50 transition" />;
    }
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 text-foreground" />
    ) : (
      <ChevronDown className="w-3 h-3 text-foreground" />
    );
  };

  return (
    <thead className="bg-surface text-foreground/50 sticky top-0 z-10 border-b border-surface-border select-none text-xs shadow-xs">
      <tr>
        <th className="py-2.5 px-3 w-8 bg-surface" />
        <th
          onClick={() => onSort("sector")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-left bg-surface"
        >
          <div className="flex items-center gap-1">
            <span>Sector</span>
            {renderSortIcon("sector")}
          </div>
        </th>
        <th
          onClick={() => onSort("civ_count")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-center bg-surface"
        >
          <div className="flex items-center justify-center gap-1">
            <span>Stocks</span>
            {renderSortIcon("civ_count")}
          </div>
        </th>
        <th
          onClick={() => onSort("avg_move_pct")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right bg-surface"
        >
          <div className="flex items-center justify-end gap-1">
            <span>Change</span>
            {renderSortIcon("avg_move_pct")}
          </div>
        </th>
        <th
          onClick={() => onSort("pct_above_vwap")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right bg-surface"
        >
          <div className="flex items-center justify-end gap-1">
            <span>VWAP%</span>
            {renderSortIcon("pct_above_vwap")}
          </div>
        </th>
        <th
          onClick={() => onSort("avg_rvol")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right bg-surface"
        >
          <div className="flex items-center justify-end gap-1">
            <span>RVOL</span>
            {renderSortIcon("avg_rvol")}
          </div>
        </th>
        <th
          onClick={() => onSort("advances")}
          className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right bg-surface"
        >
          <div className="flex items-center justify-end gap-1">
            <span>Ratio</span>
            {renderSortIcon("advances")}
          </div>
        </th>
      </tr>
    </thead>
  );
};
