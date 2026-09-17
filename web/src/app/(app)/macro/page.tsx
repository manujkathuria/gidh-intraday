"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown, LineChart, SlidersHorizontal, RotateCcw, RefreshCw } from "lucide-react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useMarketStore } from "@/stores/marketStore";
import { fetchFuturesInflow, FuturesInflowItem as FuturesItem } from "@/lib/api";

type SortField = 
  | "symbol" 
  | "fut_close" 
  | "price_1d_pct" 
  | "fresh_inflow_1d_cr" 
  | "fresh_inflow_3d_cr" 
  | "oi_1d_pct" 
  | "total_notional_cr";

export default function FuturesMacroPage() {
  const router = useRouter();
  const { selectedDate, init } = useMarketStore();

  const [data, setData] = useState<FuturesItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    init();
  }, [init]);

  // Search & Sorting
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("fresh_inflow_1d_cr");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Core Quantitative Filters
  // 1. Price Liquidity Band: ₹300 to ₹7,000
  const [minPrice, setMinPrice] = useState<number>(300);
  const [maxPrice, setMaxPrice] = useState<number>(7000);

  // 2. Institutional Inflow Gate: Inflow >= ₹40 Cr OR |OI%| >= 3.5%
  const [minInflow, setMinInflow] = useState<number>(40);
  const [minOiPct, setMinOiPct] = useState<number>(3.5);
  const [gateEnabled, setGateEnabled] = useState<boolean>(true);

  const handleReset = () => {
    setMinPrice(300);
    setMaxPrice(7000);
    setMinInflow(40);
    setMinOiPct(3.5);
    setGateEnabled(true);
    setSearch("");
  };

  const isCustom = minPrice !== 300 || maxPrice !== 7000 || minInflow !== 40 || minOiPct !== 3.5 || !gateEnabled;

  const loadData = async (targetDate: string) => {
    if (!targetDate) return;
    setLoading(true);
    try {
      const json = await fetchFuturesInflow({
        date: targetDate,
        minPrice: minPrice,
        maxPrice: maxPrice,
        minInflow: gateEnabled ? minInflow : 0,
        minOiPct: gateEnabled ? minOiPct : 0,
      });
      if (json) {
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate, minPrice, maxPrice, minInflow, minOiPct, gateEnabled]);

  // Filter & Sort Pipeline
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        // Price Band
        if (item.fut_close < minPrice) return false;
        if (maxPrice < 10000 && item.fut_close > maxPrice) return false;

        // Inflow Gate
        if (gateEnabled) {
          const inflowPass = Math.abs(item.fresh_inflow_1d_cr || 0) >= minInflow;
          const oiPass = Math.abs(item.oi_1d_pct || 0) >= minOiPct;
          if (!inflowPass && !oiPass) return false;
        }

        // Search
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          return item.symbol.toLowerCase().includes(q) || (item.trading_symbol?.toLowerCase() || "").includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [data, minPrice, maxPrice, gateEnabled, minInflow, minOiPct, search, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-25" />;
    return <span className="font-bold text-foreground">{sortAsc ? "▲" : "▼"}</span>;
  };

  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col gap-3">
      {/* Simple, Clean Toolbar */}
      <div className="flex items-center justify-between gap-3 select-none flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Clean Filter Popover */}
          <Popover className="relative text-xs">
            <PopoverButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface text-foreground/80 hover:text-foreground hover:bg-surface-hover border border-surface-border cursor-pointer transition">
              <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/50" />
              <span className="font-semibold">Filters</span>
              {isCustom && <span className="w-1.5 h-1.5 rounded-full bg-foreground" />}
            </PopoverButton>

            <PopoverPanel
              anchor="bottom start"
              className="z-50 mt-1.5 w-72 rounded-xl bg-surface border border-surface-border p-3.5 shadow-xl flex flex-col gap-3 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <span className="font-bold text-foreground uppercase tracking-wide text-[11px]">Thresholds</span>
                {isCustom && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] text-foreground/50 hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Price Band */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-foreground/70">Price Band</span>
                  <span className="font-bold text-foreground">₹{minPrice} – {maxPrice >= 10000 ? "∞" : `₹${maxPrice}`}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setMinPrice(300); setMaxPrice(7000); }}
                    className={`flex-1 py-1 rounded text-[10px] font-mono border cursor-pointer ${
                      minPrice === 300 && maxPrice === 7000
                        ? "bg-foreground text-background font-bold border-foreground"
                        : "bg-surface text-foreground/70 border-surface-border"
                    }`}
                  >
                    ₹300–₹7k
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice(0); setMaxPrice(10000); }}
                    className={`flex-1 py-1 rounded text-[10px] font-mono border cursor-pointer ${
                      minPrice === 0 && maxPrice >= 10000
                        ? "bg-foreground text-background font-bold border-foreground"
                        : "bg-surface text-foreground/70 border-surface-border"
                    }`}
                  >
                    All Prices
                  </button>
                </div>
              </div>

              {/* Inflow Gate */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-surface-border/50">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-foreground/70">Min 1D Inflow</span>
                  <span className="font-bold text-foreground">≥ ₹{minInflow} Cr</span>
                </div>
                <div className="flex gap-1">
                  {[0, 25, 40, 60, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMinInflow(val)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono border cursor-pointer ${
                        minInflow === val
                          ? "bg-foreground text-background font-bold border-foreground"
                          : "bg-surface text-foreground/60 border-surface-border"
                      }`}
                    >
                      {val === 0 ? "0" : `₹${val}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* OI Gate */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-foreground/70">Min 1D OI Change</span>
                  <span className="font-bold text-foreground">≥ {minOiPct}%</span>
                </div>
                <div className="flex gap-1">
                  {[0, 2.5, 3.5, 5.0, 8.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMinOiPct(val)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono border cursor-pointer ${
                        minOiPct === val
                          ? "bg-foreground text-background font-bold border-foreground"
                          : "bg-surface text-foreground/60 border-surface-border"
                      }`}
                    >
                      {val === 0 ? "0" : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverPanel>
          </Popover>

          {/* Quick Gate Active Toggle */}
          <button
            type="button"
            onClick={() => setGateEnabled(!gateEnabled)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition ${
              gateEnabled
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-foreground/60 border-surface-border hover:text-foreground"
            }`}
          >
            {gateEnabled ? "Gate: Active" : "Gate: Off (Show All)"}
          </button>

          {/* Explicit Apply / Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(selectedDate)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface text-foreground font-semibold border border-surface-border hover:bg-surface-hover cursor-pointer transition disabled:opacity-50"
            title="Fetch and apply latest data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-foreground" : "text-foreground/60"}`} />
            <span>Apply</span>
          </button>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-none focus:border-foreground font-mono"
            />
          </div>
        </div>

        {/* Count */}
        <div className="text-xs text-foreground/60 font-mono pr-1">
          <span className="font-bold text-foreground">{filteredData.length}</span> / {data.length} stocks
        </div>
      </div>

      {/* Clean High-Density Table */}
      <div className="bg-surface border border-surface-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-120px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface text-foreground/60 uppercase text-[10px] tracking-wider border-b border-surface-border select-none sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3.5 text-center w-10 font-bold bg-surface">#</th>

                <th
                  onClick={() => handleSort("symbol")}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Symbol</span>
                    {renderSortIndicator("symbol")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("fut_close")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Price</span>
                    {renderSortIndicator("fut_close")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("price_1d_pct")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1D Move %</span>
                    {renderSortIndicator("price_1d_pct")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("fresh_inflow_1d_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1D Inflow (₹ Cr)</span>
                    {renderSortIndicator("fresh_inflow_1d_cr")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("fresh_inflow_3d_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface hidden sm:table-cell"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>3D Inflow (₹ Cr)</span>
                    {renderSortIndicator("fresh_inflow_3d_cr")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("oi_1d_pct")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1D OI %</span>
                    {renderSortIndicator("oi_1d_pct")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("total_notional_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface hidden md:table-cell"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Notional (₹ Cr)</span>
                    {renderSortIndicator("total_notional_cr")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-foreground/40 text-xs font-mono">
                    Loading macro data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-foreground/40 text-xs font-mono">
                    No stocks match current filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const p = row.price_1d_pct || 0;
                  const oi = row.oi_1d_pct || 0;
                  const inflow1d = row.fresh_inflow_1d_cr || 0;
                  const inflow3d = row.fresh_inflow_3d_cr || 0;

                  return (
                    <tr
                      key={row.symbol}
                      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
                      className="border-b border-surface-border transition-colors cursor-pointer group hover:bg-surface-hover/60 text-xs font-mono"
                    >
                      <td className="py-2 px-3.5 text-center text-foreground/30 text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3.5 font-bold text-foreground">
                        <div className="flex items-center justify-between">
                          <span className="tracking-wide font-sans">{row.symbol}</span>
                          <Link
                            href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100"
                            title={`Open ${row.symbol} Chart`}
                          >
                            <LineChart className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>

                      <td className="py-2 px-3.5 text-right font-semibold text-foreground">
                        ₹{row.fut_close.toFixed(2)}
                      </td>

                      <td className="py-2 px-3.5 text-right font-bold">
                        <span
                          className={
                            p > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : p < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground/60"
                          }
                        >
                          {p >= 0 ? "+" : ""}{p.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-2 px-3.5 text-right font-bold">
                        <span
                          className={
                            inflow1d > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : inflow1d < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground/40"
                          }
                        >
                          {inflow1d >= 0 ? "+" : ""}₹{inflow1d.toFixed(1)} Cr
                        </span>
                      </td>

                      <td className="py-2 px-3.5 text-right text-foreground/70 hidden sm:table-cell">
                        {inflow3d !== 0 ? `₹${inflow3d.toFixed(1)} Cr` : "-"}
                      </td>

                      <td className="py-2 px-3.5 text-right text-foreground/70">
                        {oi >= 0 ? "+" : ""}{oi.toFixed(1)}%
                      </td>

                      <td className="py-2 px-3.5 text-right text-foreground/50 hidden md:table-cell">
                        ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
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
}
