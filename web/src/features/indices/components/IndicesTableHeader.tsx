"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { IndexSortField } from "../types";

interface Props {
  sortField: IndexSortField;
  sortAsc: boolean;
  onSort: (field: IndexSortField) => void;
}

export const IndicesTableHeader: React.FC<Props> = ({
  sortField,
  sortAsc,
  onSort,
}) => {
  const renderSortIndicator = (field: IndexSortField) => {
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
        {/* 1. Rank # */}
        <th className="py-2.5 px-3.5 text-center w-10 font-bold bg-background hidden sm:table-cell">#</th>

        {/* 2. Symbol */}
        <th
          onClick={() => onSort("symbol")}
          className="py-2.5 px-3.5 cursor-pointer hover:text-foreground font-bold bg-background text-left"
        >
          <div className="flex items-center gap-1.5">
            <span>Symbol</span>
            {renderSortIndicator("symbol")}
          </div>
        </th>

        {/* 3. Type / Category */}
        <th className="py-2.5 px-3.5 text-left font-bold bg-background hidden md:table-cell">
          Type
        </th>

        {/* 4. Price */}
        <th
          onClick={() => onSort("spot_price")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Price</span>
            {renderSortIndicator("spot_price")}
          </div>
        </th>

        {/* 5. Change (Pts) */}
        <th
          onClick={() => onSort("change_pts")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background hidden sm:table-cell"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Pts</span>
            {renderSortIndicator("change_pts")}
          </div>
        </th>

        {/* 6. Change (%) */}
        <th
          onClick={() => onSort("change_pct")}
          className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-background"
        >
          <div className="flex items-center justify-end gap-1.5">
            <span>Change</span>
            {renderSortIndicator("change_pct")}
          </div>
        </th>

        {/* 7. Action / Chart */}
        <th className="py-2.5 px-3.5 text-center font-bold bg-background w-16">
          Action
        </th>
      </tr>
    </thead>
  );
};
