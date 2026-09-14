"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useReplayStore } from "@/stores/replayStore";
import {
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  LineChart,
} from "lucide-react";

type SortField =
  | "symbol"
  | "sector"
  | "price"
  | "move_pct"
  | "rvol"
  | "vwap_dist_pct"
  | "clv"
  | "volume";

export const IntradayVolumeTable: React.FC = () => {
  const { snapshot, selectedSymbol, setSelectedSymbol, sectors } = useReplayStore();

  const [selectedSector, setSelectedSector] = useState("ALL");
  const [minRvol, setMinRvol] = useState<number>(0);
  const [vwapFilter, setVwapFilter] = useState<"ALL" | "ABOVE" | "BELOW">("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rvol");
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = snapshot?.stocks || [];

  const sectorOptions = useMemo(() => {
    return [
      { sector: "ALL", label: `All Sectors (${stocks.length})` },
      ...sectors.map((s) => ({
        sector: s.sector,
        label: `${s.sector} (${s.civ_count}) · ${s.avg_move_pct >= 0 ? "+" : ""}${s.avg_move_pct.toFixed(1)}% · ${s.pct_above_vwap.toFixed(0)}% VWAP`,
      })),
    ];
  }, [sectors, stocks.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    return stocks
      .filter((s) => {
        if (selectedSector !== "ALL" && s.sector !== selectedSector) return false;
        if ((s.rvol || 0) < minRvol) return false;
        if (vwapFilter === "ABOVE" && !s.is_above_vwap) return false;
        if (vwapFilter === "BELOW" && s.is_above_vwap) return false;

        const query = search.toLowerCase();
        if (
          query &&
          !s.symbol.toLowerCase().includes(query) &&
          !s.sector.toLowerCase().includes(query)
        ) {
          return false;
        }

        return true;
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
  }, [stocks, selectedSector, minRvol, vwapFilter, search, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100 transition" />
      );
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-foreground" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-foreground" />
    );
  };

  const formatVolume = (vol: number) => {
    if (!vol) return "0";
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
    return vol.toLocaleString();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Unified Monochrome Toolbar */}
      <div className="bg-surface border border-surface-border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 select-none transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              placeholder="Filter symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded pl-8 pr-2.5 py-1 text-xs text-foreground placeholder-foreground/40 focus:outline-none focus:border-foreground/40 w-44 font-mono"
            />
          </div>

          <div className="h-4 w-px bg-surface-border" />

          {/* Sector Clan Dropdown */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[11px] font-bold text-foreground/40 uppercase">
              Sector:
            </span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none cursor-pointer max-w-[220px]"
            >
              {sectorOptions.map((opt) => (
                <option key={opt.sector} value={opt.sector} className="bg-surface text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-surface-border" />

          {/* Volume Pace Filter Chips */}
          <div className="flex items-center gap-1 font-mono">
            <span className="text-[11px] font-bold text-foreground/40 uppercase pr-1">
              Pace:
            </span>
            {[
              { label: "All", val: 0 },
              { label: "≥ 5%", val: 5 },
              { label: "≥ 10%", val: 10 },
              { label: "≥ 25%", val: 25 },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => setMinRvol(item.val)}
                className={`px-2.5 py-1 text-xs rounded transition border ${
                  minRvol === item.val
                    ? "bg-foreground text-background font-bold border-foreground"
                    : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-surface-border" />

          {/* VWAP Direction Filter */}
          <div className="flex items-center gap-1 font-mono">
            <span className="text-[11px] font-bold text-foreground/40 uppercase pr-1">
              VWAP:
            </span>
            <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5">
              <button
                onClick={() => setVwapFilter("ALL")}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  vwapFilter === "ALL"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVwapFilter("ABOVE")}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  vwapFilter === "ABOVE"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                ▲ Bulls
              </button>
              <button
                onClick={() => setVwapFilter("BELOW")}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  vwapFilter === "BELOW"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                ▼ Bears
              </button>
            </div>
          </div>
        </div>

        {/* Visible Count Badge */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-foreground/40">Showing</span>
          <span className="font-bold text-foreground">
            {filteredAndSorted.length}
          </span>
          <span className="text-foreground/40">/ {stocks.length}</span>
        </div>
      </div>

      {/* 2. Clinical Monochrome Data Table */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-muted text-foreground/50 sticky top-0 z-10 border-b border-surface-border select-none">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-10 text-foreground/30 font-mono">
                  #
                </th>
                <th
                  onClick={() => handleSort("symbol")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Symbol</span>
                    {renderSortIcon("symbol")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sector")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Sector</span>
                    {renderSortIcon("sector")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("price")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Price (₹)</span>
                    {renderSortIcon("price")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("move_pct")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Move %</span>
                    {renderSortIcon("move_pct")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("rvol")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground min-w-[160px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Volume Pace (% Day)</span>
                    {renderSortIcon("rvol")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("vwap_dist_pct")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>VWAP Δ</span>
                    {renderSortIcon("vwap_dist_pct")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("clv")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>CLV</span>
                    {renderSortIcon("clv")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("volume")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Volume</span>
                    {renderSortIcon("volume")}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-border font-mono">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-foreground/40 text-xs">
                    No stocks match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((stock, idx) => {
                  const isSelected = stock.symbol === selectedSymbol;
                  const move = Number(stock.move_pct || 0);
                  const pace = Number(stock.rvol || 0);
                  const clv = Number(stock.clv || 0);
                  const vwapDist = Number(stock.vwap_dist_pct || 0);
                  const isAbove = Boolean(stock.is_above_vwap);
                  const price = Number(stock.price || 0);
                  const vol = Number(stock.volume || 0);

                  const rvolBarPct = Math.min(100, Math.max(2, pace));

                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-surface-hover font-semibold"
                          : "hover:bg-surface-muted/60"
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-2.5 px-3 text-center text-foreground/30 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Symbol */}
                      <td className="py-2.5 px-3 font-bold text-foreground flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAbove ? "bg-foreground" : "bg-foreground/30"
                            }`}
                          />
                          <span className="text-xs tracking-wide">
                            {stock.symbol}
                          </span>
                          {pace >= 10.0 && (
                            <span className="px-1 py-0.2 rounded bg-foreground text-background text-[9px] font-bold tracking-tighter">
                              SURGE
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/chart?symbol=${encodeURIComponent(stock.symbol)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
                          title={`Open ${stock.symbol} Candlestick Chart`}
                        >
                          <LineChart className="w-3.5 h-3.5" />
                        </Link>
                      </td>

                      {/* Sector */}
                      <td className="py-2.5 px-3 text-foreground/50 text-[11px]">
                        {stock.sector}
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 text-right text-foreground text-xs">
                        ₹{price.toFixed(2)}
                      </td>

                      {/* Move % (Monochrome with subtle sign indicator) */}
                      <td
                        className={`py-2.5 px-3 text-right font-bold text-xs ${
                          move > 0
                            ? "text-foreground"
                            : move < 0
                            ? "text-foreground/60"
                            : "text-foreground/40"
                        }`}
                      >
                        {move >= 0 ? "+" : ""}
                        {move.toFixed(2)}%
                      </td>

                      {/* Volume Pace Progress Bar */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 bg-surface-border h-1 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-foreground rounded-full"
                              style={{ width: `${rvolBarPct}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs text-foreground">
                            {pace.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* VWAP Distance */}
                      <td className="py-2.5 px-3 text-right font-medium text-xs text-foreground/80">
                        {isAbove ? "▲" : "▼"} {Math.abs(vwapDist).toFixed(2)}%
                      </td>

                      {/* CLV */}
                      <td className="py-2.5 px-3 text-right text-xs text-foreground/70">
                        {clv.toFixed(2)}
                      </td>

                      {/* Volume */}
                      <td className="py-2.5 px-3 text-right text-foreground/40 text-xs">
                        {formatVolume(vol)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
