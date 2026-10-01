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
        <th className="py-2.5 px-3 text-center w-12 font-bold bg-background hidden sm:table-cell">#</th>

        <th
          onClick={() => onSort("symbol")}
          className="py-2.5 px-4 cursor-pointer hover:text-foreground font-bold bg-background text-left w-[24%]"
        >
          <div className="flex items-center gap-1.5">
            <span>Symbol</span>
            {renderSortIndicator("symbol")}
          </div>
        </th>

        <th
          onClick={() => onSort("move_pct")}
          className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground font-bold bg-background w-[20%]"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Price / Change</span>
            {renderSortIndicator("move_pct")}
          </div>
        </th>

        <th
          onClick={() => onSort("rvol")}
          className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground font-bold bg-background w-[14%]"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>RVOL</span>
            {renderSortIndicator("rvol")}
          </div>
        </th>

        <th
          onClick={() => onSort("vwap_dist_pct")}
          className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground font-bold bg-background w-[14%]"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>VWAP Dist</span>
            {renderSortIndicator("vwap_dist_pct")}
          </div>
        </th>

        <th
          onClick={() => onSort("pd_context")}
          className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground font-bold bg-background w-[14%] hidden md:table-cell"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>PD Context</span>
            {renderSortIndicator("pd_context")}
          </div>
        </th>

        <th
          onClick={() => onSort("futures_oi")}
          className="py-2.5 px-4 text-right cursor-pointer hover:text-foreground font-bold bg-background w-[14%] hidden sm:table-cell"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>1D OI Flow</span>
            {renderSortIndicator("futures_oi")}
          </div>
        </th>
      </tr>
    </thead>
  );
};
