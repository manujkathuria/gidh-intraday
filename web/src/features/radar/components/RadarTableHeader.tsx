"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { SortField } from "../types";

interface Props {
  sortField: SortField;
  sortAsc: boolean;
  onSort: (field: SortField) => void;
}

export const RadarTableHeader: React.FC<Props> = ({
  sortField,
  sortAsc,
  onSort,
}) => {
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return (
      <span className="font-bold text-foreground">
        {sortAsc ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <thead className="bg-background text-foreground/50 uppercase text-[10px] tracking-wider border-b border-surface-border select-none sticky top-0 z-10 backdrop-blur-sm">
      <tr>
        <th className="py-2.5 px-3.5 text-center w-10 font-bold bg-background hidden sm:table-cell">#</th>

        <th
          onClick={() => onSort("symbol")}
          className="py-2.5 px-3.5 cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center gap-1.5">
            <span>Symbol</span>
            {renderSortIndicator("symbol")}
          </div>
        </th>

        <th
          onClick={() => onSort("sector")}
          className="py-2.5 px-3.5 cursor-pointer hover:text-foreground font-bold bg-background hidden lg:table-cell"
        >
          <div className="flex items-center gap-1.5">
            <span>Sector</span>
            {renderSortIndicator("sector")}
          </div>
        </th>

        <th
          onClick={() => onSort("price")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Price</span>
            {renderSortIndicator("price")}
          </div>
        </th>

        <th
          onClick={() => onSort("move_pct")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Change</span>
            {renderSortIndicator("move_pct")}
          </div>
        </th>

        <th
          onClick={() => onSort("rvol")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>RVOL</span>
            {renderSortIndicator("rvol")}
          </div>
        </th>

        <th
          onClick={() => onSort("vwap_dist_pct")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background hidden md:table-cell"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>VWAP</span>
            {renderSortIndicator("vwap_dist_pct")}
          </div>
        </th>

        <th className="py-2.5 px-3.5 text-center font-bold bg-background">
          Action
        </th>
      </tr>
    </thead>
  );
};
