"use client";

import React from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
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
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-foreground/20 group-hover:text-foreground/50 transition" />;
    }
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 text-foreground" />
    ) : (
      <ChevronDown className="w-3 h-3 text-foreground" />
    );
  };

  const columns: { field: SortField; label: string; align?: "left" | "right" }[] = [
    { field: "symbol", label: "Symbol" },
    { field: "sector", label: "Sector" },
    { field: "price", label: "Price", align: "right" },
    { field: "move_pct", label: "Move %", align: "right" },
    { field: "rvol", label: "Vol Pace %" },
    { field: "vwap_dist_pct", label: "VWAP Dist", align: "right" },
    { field: "clv", label: "CLV (0-1)", align: "right" },
    { field: "volume", label: "Volume", align: "right" },
  ];

  return (
    <thead className="bg-surface-muted text-foreground/50 sticky top-0 z-10 border-b border-surface-border select-none font-mono text-xs">
      <tr>
        <th className="py-2.5 px-3 font-semibold text-center w-10 text-foreground/30 font-mono">
          #
        </th>
        {columns.map((col) => (
          <th
            key={col.field}
            onClick={() => onSort(col.field)}
            className={`py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground transition ${
              col.align === "right" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`flex items-center gap-1 ${
                col.align === "right" ? "justify-end" : "justify-start"
              }`}
            >
              <span>{col.label}</span>
              {renderSortIcon(col.field)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
};
