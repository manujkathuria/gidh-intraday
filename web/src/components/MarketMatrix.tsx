"use client";

import React, { useState } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { Search } from "lucide-react";

export const MarketMatrix: React.FC = () => {
  const { snapshot, selectedSymbol, setSelectedSymbol } = useReplayStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rvol" | "move" | "vwap_dist">("rvol");
  const [sectorFilter, setSectorFilter] = useState("ALL");

  if (!snapshot || !snapshot.stocks) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-white/40">
        Loading Vectorized Market Matrix...
      </div>
    );
  }

  const sectors = ["ALL", ...Array.from(new Set(snapshot.stocks.map((s) => s.sector)))].sort();

  const filtered = snapshot.stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.sector.toLowerCase().includes(search.toLowerCase());
    const matchesSector = sectorFilter === "ALL" || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rvol") return (b.rvol || 0) - (a.rvol || 0);
    if (sortBy === "move") return (b.move_pct || 0) - (a.move_pct || 0);
    if (sortBy === "vwap_dist") return (b.vwap_dist_pct || 0) - (a.vwap_dist_pct || 0);
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
      {/* Matrix Controls */}
      <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            210 Stock Tactical Radar
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
            {sorted.length} Assets
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Filter symbol/sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Sector Filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec} className="bg-zinc-900 text-white">
                {sec}
              </option>
            ))}
          </select>

          {/* Sort Buttons */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy("rvol")}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                sortBy === "rvol" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              RVOL
            </button>
            <button
              onClick={() => setSortBy("move")}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                sortBy === "move" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              MOVE %
            </button>
            <button
              onClick={() => setSortBy("vwap_dist")}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                sortBy === "vwap_dist" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              VWAP Δ
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Stock Cards */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 custom-scrollbar">
        {sorted.map((stock) => {
          const isSelected = stock.symbol === selectedSymbol;
          const move = Number(stock.move_pct || 0);
          const isGreen = move >= 0;
          const isAboveVwap = Boolean(stock.is_above_vwap);
          const price = Number(stock.price || 0);
          const rvol = Number(stock.rvol || 0);
          const vwapDist = Number(stock.vwap_dist_pct || 0);

          return (
            <div
              key={stock.symbol}
              onClick={() => setSelectedSymbol(stock.symbol)}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white tracking-wide">
                  {stock.symbol}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isGreen ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isGreen ? "+" : ""}
                  {move.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/50 mb-1.5">
                <span className="truncate max-w-[70px]">{stock.sector}</span>
                <span className="font-mono text-white/80 font-medium">
                  ₹{price.toFixed(1)}
                </span>
              </div>

              {/* Badges: RVOL & VWAP distance */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                    rvol >= 2.0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : rvol >= 1.2
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  {rvol.toFixed(1)}x VOL
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    isAboveVwap
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {isAboveVwap ? "▲" : "▼"} {Math.abs(vwapDist).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
