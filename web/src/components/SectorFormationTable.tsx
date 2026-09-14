"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useReplayStore } from "@/stores/replayStore";
import {
  ChevronUp,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  LineChart,
} from "lucide-react";

type SectorSortField =
  | "sector"
  | "civ_count"
  | "avg_move_pct"
  | "pct_above_vwap"
  | "avg_rvol";

export const SectorFormationTable: React.FC = () => {
  const { snapshot, sectors, setSelectedSymbol } = useReplayStore();

  const [search, setSearch] = useState("");
  const [vwapDominanceFilter, setVwapDominanceFilter] = useState<"ALL" | "BULL" | "BEAR">("ALL");
  const [sortField, setSortField] = useState<SectorSortField>("avg_move_pct");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const stocks = snapshot?.stocks || [];

  // Group stocks by sector for vanguard leader/laggard & expansion
  const sectorGroupedStocks = useMemo(() => {
    const map: Record<string, typeof stocks> = {};
    for (const s of stocks) {
      if (!map[s.sector]) map[s.sector] = [];
      map[s.sector].push(s);
    }
    for (const key in map) {
      map[key].sort((a, b) => (b.move_pct || 0) - (a.move_pct || 0));
    }
    return map;
  }, [stocks]);

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSortedSectors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sectors
      .filter((sec) => {
        // Search Filter: Match Sector Name OR any underlying stock symbol
        if (q) {
          const matchesSector = sec.sector.toLowerCase().includes(q);
          const secStocks = sectorGroupedStocks[sec.sector] || [];
          const matchesStock = secStocks.some((stk) =>
            stk.symbol.toLowerCase().includes(q)
          );
          if (!matchesSector && !matchesStock) {
            return false;
          }
        }

        // Dominance Filter
        if (vwapDominanceFilter === "BULL" && (sec.pct_above_vwap || 0) < 50) return false;
        if (vwapDominanceFilter === "BEAR" && (sec.pct_above_vwap || 0) >= 50) return false;

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
  }, [sectors, sectorGroupedStocks, search, vwapDominanceFilter, sortField, sortAsc]);

  const renderSortIcon = (field: SectorSortField) => {
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

  const dominantSector = sectors.length > 0 ? sectors[0] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Sector Formation Filter Toolbar */}
      <div className="bg-surface border border-surface-border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 select-none transition-colors">
        <div className="flex flex-wrap items-center gap-3 font-mono">
          {/* Search Sector & Stock */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              placeholder="Search sector or stock (e.g. NTPC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded pl-8 pr-2.5 py-1 text-xs text-foreground placeholder-foreground/40 focus:outline-none w-64"
            />
          </div>

          <div className="h-4 w-px bg-surface-border" />

          {/* VWAP Clan Formation Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-foreground/40 uppercase pr-1">
              Clan Dominance:
            </span>
            <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5">
              <button
                onClick={() => setVwapDominanceFilter("ALL")}
                className={`px-2.5 py-0.5 text-xs rounded transition ${
                  vwapDominanceFilter === "ALL"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                All Sectors
              </button>
              <button
                onClick={() => setVwapDominanceFilter("BULL")}
                className={`px-2.5 py-0.5 text-xs rounded transition flex items-center gap-1 ${
                  vwapDominanceFilter === "BULL"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-3 h-3" /> Bull Formations (≥50% VWAP)
              </button>
              <button
                onClick={() => setVwapDominanceFilter("BEAR")}
                className={`px-2.5 py-0.5 text-xs rounded transition flex items-center gap-1 ${
                  vwapDominanceFilter === "BEAR"
                    ? "bg-foreground text-background font-bold"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                <TrendingDown className="w-3 h-3" /> Bear Formations (&lt;50% VWAP)
              </button>
            </div>
          </div>
        </div>

        {/* Sector Summary Count */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-foreground/40">Showing</span>
          <span className="font-bold text-foreground">
            {filteredAndSortedSectors.length}
          </span>
          <span className="text-foreground/40">/ {sectors.length} Sectors</span>
          {dominantSector && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
              Leader: <strong className="text-foreground">{dominantSector.sector}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 2. Sector Formation Table */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-surface-muted text-foreground/50 sticky top-0 z-10 border-b border-surface-border select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-10 text-foreground/30">
                  #
                </th>
                <th
                  onClick={() => handleSort("sector")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Sector Clan</span>
                    {renderSortIcon("sector")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("civ_count")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-center w-20"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Stocks</span>
                    {renderSortIcon("civ_count")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("avg_move_pct")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right w-28"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg Move %</span>
                    {renderSortIcon("avg_move_pct")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pct_above_vwap")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground min-w-[180px]"
                >
                  <div className="flex items-center gap-1">
                    <span>VWAP Dominance (% Above VWAP)</span>
                    {renderSortIcon("pct_above_vwap")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("avg_rvol")}
                  className="py-2.5 px-3 font-semibold cursor-pointer group hover:text-foreground text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg Vol Pace</span>
                    {renderSortIcon("avg_rvol")}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-left">
                  <span>Lead Vanguard (Top Mover)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-left">
                  <span>Laggard (Weakest Link)</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-border">
              {filteredAndSortedSectors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-foreground/40 text-xs">
                    No sector battalions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedSectors.map((sec, idx) => {
                  const secStocks = sectorGroupedStocks[sec.sector] || [];
                  const q = search.trim().toLowerCase();
                  const matchesStockDirectly = q && secStocks.some(s => s.symbol.toLowerCase().includes(q));
                  const isExpanded = expandedSector === sec.sector || Boolean(matchesStockDirectly);
                  const vanguard = secStocks.length > 0 ? secStocks[0] : null;
                  const laggard = secStocks.length > 1 ? secStocks[secStocks.length - 1] : null;

                  const pctAbove = Number(sec.pct_above_vwap || 0);
                  const avgMove = Number(sec.avg_move_pct || 0);
                  const avgRVOL = Number(sec.avg_rvol || 0);

                  return (
                    <React.Fragment key={sec.sector}>
                      <tr
                        onClick={() =>
                          setExpandedSector(isExpanded ? null : sec.sector)
                        }
                        className="hover:bg-surface-hover/80 cursor-pointer transition border-b border-surface-border group"
                      >
                        {/* Row Index */}
                        <td className="py-2.5 px-3 text-center text-foreground/30 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Sector Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground/40 group-hover:text-foreground transition">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <span className="font-bold text-xs text-foreground tracking-wide">
                              {sec.sector}
                            </span>
                          </div>
                        </td>

                        {/* Civs Count */}
                        <td className="py-2.5 px-3 text-center text-foreground/70 font-medium">
                          {sec.civ_count}
                        </td>

                        {/* Average Move % */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-bold">
                            {avgMove >= 0 ? (
                              <TrendingUp className="w-3 h-3 text-foreground" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-foreground/60" />
                            )}
                            <span
                              className={
                                avgMove >= 0
                                  ? "text-foreground"
                                  : "text-foreground/60"
                              }
                            >
                              {avgMove >= 0 ? "+" : ""}
                              {avgMove.toFixed(2)}%
                            </span>
                          </div>
                        </td>

                        {/* VWAP Dominance Clan Gauge Bar */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            {/* Visual clan dominance bar */}
                            <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${pctAbove}%` }}
                                className={`h-full transition-all duration-300 ${
                                  pctAbove >= 50 ? "bg-foreground" : "bg-foreground/40"
                                }`}
                              />
                            </div>
                            <span className="font-bold text-xs min-w-[35px] text-right text-foreground">
                              {pctAbove.toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-foreground/40 min-w-[40px]">
                              ({Math.round((pctAbove / 100) * sec.civ_count)}/{sec.civ_count})
                            </span>
                          </div>
                        </td>

                        {/* Average RVOL Pace */}
                        <td className="py-2.5 px-3 text-right text-foreground/80 font-medium">
                          {avgRVOL.toFixed(1)}%
                        </td>

                        {/* Vanguard Leader */}
                        <td className="py-2.5 px-3 text-xs">
                          {vanguard ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSymbol(vanguard.symbol);
                              }}
                              className="px-2 py-0.5 rounded bg-surface-muted hover:bg-surface-border border border-surface-border text-foreground transition flex items-center gap-1.5"
                            >
                              <span className="font-bold">{vanguard.symbol}</span>
                              <span className="text-foreground/70">
                                {vanguard.move_pct >= 0 ? "+" : ""}
                                {vanguard.move_pct.toFixed(1)}%
                              </span>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Laggard */}
                        <td className="py-2.5 px-3 text-xs">
                          {laggard ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSymbol(laggard.symbol);
                              }}
                              className="px-2 py-0.5 rounded bg-surface-muted hover:bg-surface-border border border-surface-border text-foreground/60 hover:text-foreground transition flex items-center gap-1.5"
                            >
                              <span className="font-bold">{laggard.symbol}</span>
                              <span>
                                {laggard.move_pct >= 0 ? "+" : ""}
                                {laggard.move_pct.toFixed(1)}%
                              </span>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>

                      {/* Expanded Sector Drill-Down Rows */}
                      {isExpanded && (
                        <tr className="bg-surface-muted/40">
                          <td colSpan={8} className="p-3 pl-12">
                            <div className="border border-surface-border rounded-md bg-surface overflow-hidden">
                              <div className="px-3 py-1.5 bg-surface-muted border-b border-surface-border text-[11px] font-bold text-foreground/70">
                                Underlying {sec.sector} Stocks ({secStocks.length} Assets)
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
                                {secStocks.map((stk) => {
                                  const isMatched = q && stk.symbol.toLowerCase().includes(q);
                                  return (
                                    <div
                                      key={stk.symbol}
                                      onClick={() => setSelectedSymbol(stk.symbol)}
                                      className={`p-2 rounded border cursor-pointer transition flex flex-col gap-1 ${
                                        isMatched
                                          ? "bg-surface-hover border-foreground shadow-sm ring-1 ring-foreground"
                                          : "bg-surface-muted hover:bg-surface-hover border-surface-border"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`font-bold text-xs ${isMatched ? "text-foreground font-black underline" : "text-foreground"}`}>
                                            {stk.symbol}
                                          </span>
                                          <Link
                                            href={`/chart?symbol=${encodeURIComponent(stk.symbol)}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-foreground/40 hover:text-foreground p-0.5 rounded transition"
                                            title={`Open ${stk.symbol} Chart`}
                                          >
                                            <LineChart className="w-3 h-3" />
                                          </Link>
                                        </div>
                                        <span
                                          className={`text-xs font-bold ${
                                            stk.move_pct >= 0
                                              ? "text-foreground"
                                              : "text-foreground/60"
                                          }`}
                                        >
                                          {stk.move_pct >= 0 ? "+" : ""}
                                          {stk.move_pct.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-foreground/50">
                                        <span>₹{stk.price.toFixed(1)}</span>
                                        <span>
                                          {stk.is_above_vwap ? "▲ VWAP" : "▼ VWAP"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
