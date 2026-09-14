"use client";

import React, { useState, useMemo } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

type SortField = "symbol" | "sector" | "gap_pct" | "move_pct" | "rvol" | "clv" | "vwap_dist_pct" | "price";

export const LeaderboardTable: React.FC = () => {
  const { snapshot, selectedSymbol, setSelectedSymbol } = useReplayStore();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rvol");
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = snapshot?.stocks || [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for metrics
    }
  };

  const filteredAndSorted = useMemo(() => {
    return stocks
      .filter((s) => {
        const query = search.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(query) ||
          s.sector.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;

        if (typeof valA === "string") {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }

        return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [stocks, search, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition" />;
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
    );
  };

  return (
    <div className="flex flex-col bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-black/20">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            09:30 Tactical Leaderboard
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
            {filteredAndSorted.length} Assets
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search symbol or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-black/50 border border-white/15 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 w-56"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-black/40 text-white/50 sticky top-0 z-10 border-b border-white/10 select-none">
            <tr>
              <th
                onClick={() => handleSort("symbol")}
                className="p-3 font-semibold cursor-pointer group hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Symbol</span>
                  {renderSortIcon("symbol")}
                </div>
              </th>
              <th
                onClick={() => handleSort("sector")}
                className="p-3 font-semibold cursor-pointer group hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Sector</span>
                  {renderSortIcon("sector")}
                </div>
              </th>
              <th
                onClick={() => handleSort("gap_pct")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Gap %</span>
                  {renderSortIcon("gap_pct")}
                </div>
              </th>
              <th
                onClick={() => handleSort("move_pct")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Move %</span>
                  {renderSortIcon("move_pct")}
                </div>
              </th>
              <th
                onClick={() => handleSort("rvol")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>RVOL</span>
                  {renderSortIcon("rvol")}
                </div>
              </th>
              <th
                onClick={() => handleSort("clv")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>CLV</span>
                  {renderSortIcon("clv")}
                </div>
              </th>
              <th
                onClick={() => handleSort("vwap_dist_pct")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>VWAP Δ</span>
                  {renderSortIcon("vwap_dist_pct")}
                </div>
              </th>
              <th
                onClick={() => handleSort("price")}
                className="p-3 font-semibold cursor-pointer group hover:text-white text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Price (₹)</span>
                  {renderSortIcon("price")}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 font-mono">
            {filteredAndSorted.map((stock) => {
              const isSelected = stock.symbol === selectedSymbol;
              const move = Number(stock.move_pct || 0);
              const gap = Number(stock.gap_pct || 0);
              const rvol = Number(stock.rvol || 0);
              const clv = Number(stock.clv || 0);
              const vwapDist = Number(stock.vwap_dist_pct || 0);
              const isAbove = Boolean(stock.is_above_vwap);
              const price = Number(stock.price || 0);

              return (
                <tr
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-indigo-950/50 hover:bg-indigo-950/70"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Symbol */}
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAbove ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <span>{stock.symbol}</span>
                  </td>

                  {/* Sector */}
                  <td className="p-3 text-white/50 text-[11px] font-sans">
                    {stock.sector}
                  </td>

                  {/* Gap % */}
                  <td
                    className={`p-3 text-right font-medium ${
                      gap > 0
                        ? "text-emerald-400"
                        : gap < 0
                        ? "text-rose-400"
                        : "text-white/40"
                    }`}
                  >
                    {gap > 0 ? "+" : ""}
                    {gap.toFixed(2)}%
                  </td>

                  {/* Move % */}
                  <td
                    className={`p-3 text-right font-bold ${
                      move >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {move >= 0 ? "+" : ""}
                    {move.toFixed(2)}%
                  </td>

                  {/* RVOL */}
                  <td className="p-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        rvol >= 10.0
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : rvol >= 4.0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : rvol >= 2.0
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-white/60"
                      }`}
                    >
                      {rvol.toFixed(2)}x
                    </span>
                  </td>

                  {/* CLV */}
                  <td
                    className={`p-3 text-right ${
                      clv >= 0.75
                        ? "text-emerald-400 font-bold"
                        : clv <= 0.25
                        ? "text-rose-400 font-bold"
                        : "text-white/70"
                    }`}
                  >
                    {clv.toFixed(2)}
                  </td>

                  {/* VWAP Distance */}
                  <td
                    className={`p-3 text-right ${
                      isAbove ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isAbove ? "▲" : "▼"} {Math.abs(vwapDist).toFixed(2)}%
                  </td>

                  {/* Price */}
                  <td className="p-3 text-right font-bold text-white">
                    {price.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
