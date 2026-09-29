"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { FuturesInflowItem } from "@/lib/api";
import { SortField } from "../types";
import { FuturesTableRow } from "./FuturesTableRow";
import { FuturesMobileCard } from "./FuturesMobileCard";

interface Props {
  data: FuturesInflowItem[];
  loading: boolean;
  sortField: SortField;
  sortAsc: boolean;
  onSort: (field: SortField) => void;
}

interface ColumnDef {
  field?: SortField;
  label: string;
  align?: "left" | "right" | "center";
  hiddenClass?: string;
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  { label: "#", align: "center", width: "w-10", hiddenClass: "hidden sm:table-cell" },
  { field: "symbol", label: "Symbol / Contract", align: "left" },
  { field: "fut_close", label: "Price (₹)", align: "right" },
  { field: "price_1d_pct", label: "Price Δ (1D)", align: "right" },
  { field: "fut_oi", label: "Open Interest", align: "right" },
  { field: "oi_1d_pct", label: "OI Δ (1D)", align: "right" },
  { field: "fresh_inflow_1d_cr", label: "1D Inflow (₹ Cr)", align: "right" },
  { field: "fresh_inflow_3d_cr", label: "3D Inflow (₹ Cr)", align: "right", hiddenClass: "hidden sm:table-cell" },
  { field: "total_notional_cr", label: "Notional (₹ Cr)", align: "right", hiddenClass: "hidden md:table-cell" },
];

export const FuturesTable: React.FC<Props> = ({
  data,
  loading,
  sortField,
  sortAsc,
  onSort,
}) => {
  return (
    <>
      {/* Mobile Card List View (< md) */}
      <div className="md:hidden flex flex-col divide-y divide-surface-border/40">
        {loading ? (
          <div className="py-16 text-center text-foreground/40 text-xs">
            Loading futures dynamics...
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-foreground/40 text-xs">
            No contracts found.
          </div>
        ) : (
          data.map((row, idx) => (
            <FuturesMobileCard key={row.symbol} row={row} index={idx} />
          ))
        )}
      </div>

      {/* Desktop High-Density Table View (md+) */}
      <div className="hidden md:block w-full">
        <div className="overflow-x-auto max-h-[calc(100vh-120px)] custom-scrollbar border border-surface-border/40 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-background text-foreground/50 uppercase text-[10px] tracking-wider border-b border-surface-border select-none sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                {COLUMNS.map((col, i) => {
                  const isSortable = !!col.field;
                  const isActive = col.field === sortField;

                  return (
                    <th
                      key={col.label + i}
                      onClick={() => col.field && onSort(col.field)}
                      className={`py-2.5 px-3.5 font-bold bg-background whitespace-nowrap ${col.width || ""} ${col.hiddenClass || ""} ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      } ${isSortable ? "cursor-pointer hover:text-foreground" : ""}`}
                    >
                      <div
                        className={`flex items-center gap-1.5 ${
                          col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"
                        }`}
                      >
                        <span>{col.label}</span>
                        {isSortable && (
                          isActive ? (
                            <span className="font-bold text-foreground">{sortAsc ? "▲" : "▼"}</span>
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/30">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center text-foreground/40 text-xs">
                    Loading futures dynamics...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-16 text-center text-foreground/40 text-xs">
                    No contracts found.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <FuturesTableRow key={row.symbol} row={row} index={idx} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
