"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Zap, 
  ArrowUpDown, 
  LineChart,
  Filter
} from "lucide-react";
import { SessionCalendarPopover } from "@/features/header/components/SessionCalendarPopover";
import { MacroFilterPopover } from "@/features/macro/components/MacroFilterPopover";
import { MacroMobileCard } from "@/features/macro/components/MacroMobileCard";
import { MacroPresetDropdown } from "@/features/macro/components/MacroPresetDropdown";
import { fetchFuturesInflow, FuturesInflowItem as FuturesItem } from "@/lib/api";

type MacroPreset = "ALL" | "LONGS" | "SHORTS" | "UNWINDING" | "COVERING";
type SortField = "symbol" | "fut_close" | "price_1d_pct" | "oi_1d_pct" | "fresh_inflow_1d_cr" | "fresh_inflow_3d_cr" | "total_notional_cr";

export default function FuturesMacroPage() {
  const router = useRouter();

  // Local independent date state (Does NOT affect Live or Replay mode)
  const [macroDate, setMacroDate] = useState<string>("2026-08-25");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<FuturesItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Radar-Style Filter State
  const [preset, setPreset] = useState<MacroPreset>("ALL");
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("fresh_inflow_1d_cr");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Dynamic Threshold controls
  const [minInflow, setMinInflow] = useState<number>(50);
  const [minOiPct, setMinOiPct] = useState<number>(5.0);
  const [minPricePct, setMinPricePct] = useState<number>(0.75);
  const [minPrice, setMinPrice] = useState<number>(300);
  const [maxPrice, setMaxPrice] = useState<number>(5000);

  const setPriceRange = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  // Fetch macro data independently whenever macroDate changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const json = await fetchFuturesInflow(macroDate);
        if (!json) throw new Error("Failed to load macro data");
        if (isMounted) {
          setData(json.data || []);
          if (json.available_dates && json.available_dates.length > 0) {
            setAvailableDates(json.available_dates);
            if (!macroDate) {
              setMacroDate(json.available_dates[0]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [macroDate]);

  // Classify each stock into State (with price filtering)
  const classifiedData = useMemo(() => {
    return data
      .filter((item) => {
        if (item.fut_close < minPrice) return false;
        if (maxPrice < 10000 && item.fut_close > maxPrice) return false;
        return true;
      })
      .map((item) => {
        const p = item.price_1d_pct || 0;
        const oi = item.oi_1d_pct || 0;
        const inflow = item.fresh_inflow_1d_cr || 0;

        let state: MacroPreset = "ALL";
        if (p >= minPricePct && inflow >= minInflow && oi >= minOiPct) {
          state = "LONGS";
        } else if (p <= -minPricePct && (inflow >= minInflow || oi >= minOiPct)) {
          state = "SHORTS";
        } else if (p < 0 && oi < 0) {
          state = "UNWINDING";
        } else if (p > 0 && oi < 0) {
          state = "COVERING";
        }

        return { ...item, state };
      });
  }, [data, minPrice, maxPrice, minPricePct, minInflow, minOiPct]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = classifiedData;

    // 1. Preset filter
    if (preset !== "ALL") {
      result = result.filter((d) => d.state === preset);
    }

    // 2. Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((d) => d.symbol.toLowerCase().includes(q));
    }

    // 3. Sort
    return [...result].sort((a, b) => {
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
  }, [classifiedData, preset, search, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return <span className="font-bold text-foreground">{sortAsc ? "▲" : "▼"}</span>;
  };

  const presets: { id: MacroPreset; label: string; icon: React.FC<{ className?: string }>; count: number }[] = [
    { id: "ALL", label: "All", icon: Layers, count: classifiedData.length },
    { id: "LONGS", label: "Longs", icon: TrendingUp, count: classifiedData.filter((d) => d.state === "LONGS").length },
    { id: "SHORTS", label: "Shorts", icon: TrendingDown, count: classifiedData.filter((d) => d.state === "SHORTS").length },
    { id: "UNWINDING", label: "Unwind", icon: ShieldAlert, count: classifiedData.filter((d) => d.state === "UNWINDING").length },
    { id: "COVERING", label: "Cover", icon: Zap, count: classifiedData.filter((d) => d.state === "COVERING").length },
  ];

  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col">
      <div className="flex flex-col gap-3">
        {/* 1. Header Toolbar (Mobile: 2 clean tight rows, Desktop: 1 clean row) */}
        <div className="flex flex-col gap-2 py-1 text-xs select-none">
        {/* Top Control Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {/* Independent Macro Session Calendar Popover */}
            <div className="flex items-center bg-surface border border-surface-border rounded-md px-2 py-1 shrink-0">
              <SessionCalendarPopover
                selectedDate={macroDate}
                onSelectDate={(d) => setMacroDate(d)}
                validSessions={availableDates}
              />
            </div>

            {/* Mobile Stance Preset Dropdown (< md) */}
            <div className="md:hidden flex-1">
              <MacroPresetDropdown
                preset={preset}
                setPreset={setPreset}
                presets={presets}
              />
            </div>

            {/* Desktop Segmented Pill Buttons (md+) */}
            <div className="hidden md:flex items-center bg-surface-muted/60 border border-surface-border rounded-md p-0.5">
              {presets.map((p) => {
                const Icon = p.icon;
                const isActive = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`px-2.5 py-1 rounded transition text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-surface text-foreground font-extrabold shadow-2xs border border-surface-border"
                        : "text-foreground/60 hover:text-foreground hover:bg-surface-hover/60 border border-transparent font-medium"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-foreground" : "text-foreground/50"}`} />
                    <span>{p.label}</span>
                    <span className={`text-[10px] px-1 rounded ${isActive ? "bg-surface-muted text-foreground" : "text-foreground/40"}`}>
                      {p.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Macro Filter Popover */}
            <div className="shrink-0">
              <MacroFilterPopover
                minInflow={minInflow}
                setMinInflow={setMinInflow}
                minOiPct={minOiPct}
                setMinOiPct={setMinOiPct}
                minPricePct={minPricePct}
                setMinPricePct={setMinPricePct}
                minPrice={minPrice}
                maxPrice={maxPrice}
                setPriceRange={setPriceRange}
              />
            </div>

            {/* Desktop Search Input (md+) */}
            <div className="hidden md:block relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
              />
            </div>
          </div>

          {/* Desktop Showing Count (md+) */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/50 pr-1 shrink-0">
            <span>Showing</span>
            <span className="font-bold text-foreground">{filteredAndSorted.length}</span>
            <span>/ {classifiedData.length} Stocks</span>
          </div>
        </div>

        {/* Mobile Search & Count Bar (< md) */}
        <div className="md:hidden flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md bg-surface pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
            />
          </div>
          <div className="text-[11px] text-foreground/50 shrink-0 font-mono px-1">
            <span className="font-bold text-foreground">{filteredAndSorted.length}</span>/{classifiedData.length}
          </div>
        </div>
      </div>

      {/* 2. Mobile View: Touch-Friendly Stock Cards (< md) */}
      <div className="md:hidden bg-surface border border-surface-border rounded-lg overflow-hidden flex flex-col divide-y divide-surface-border">
        {loading ? (
          <div className="py-12 text-center text-foreground/40 text-xs font-mono">
            Scanning futures money inflow...
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="py-12 text-center text-foreground/40 text-xs">
            No stocks match this filter.
          </div>
        ) : (
          filteredAndSorted.map((row, idx) => (
            <MacroMobileCard key={row.symbol} row={row} index={idx} />
          ))
        )}
      </div>

      {/* 3. iPad / Desktop View: High-Density Table (hidden on mobile, visible md+) */}
      <div className="hidden md:block bg-surface border border-surface-border rounded-lg overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface text-foreground/60 uppercase text-[10px] tracking-wider border-b border-surface-border select-none sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="py-2.5 px-3.5 text-center w-10 font-bold bg-surface hidden sm:table-cell">#</th>

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
                    <span>Price 1D %</span>
                    {renderSortIndicator("price_1d_pct")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("oi_1d_pct")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>OI 1D %</span>
                    {renderSortIndicator("oi_1d_pct")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("fresh_inflow_1d_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>1D Net Inflow</span>
                    {renderSortIndicator("fresh_inflow_1d_cr")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("fresh_inflow_3d_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface hidden md:table-cell"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>3D Net Inflow</span>
                    {renderSortIndicator("fresh_inflow_3d_cr")}
                  </div>
                </th>

                <th
                  onClick={() => handleSort("total_notional_cr")}
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:text-foreground font-bold bg-surface hidden lg:table-cell"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Notional</span>
                    {renderSortIndicator("total_notional_cr")}
                  </div>
                </th>

                <th className="py-2.5 px-3.5 text-center font-bold bg-surface w-24">
                  Institutional Stance
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground/40 text-xs font-mono">
                    Scanning futures money inflow...
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground/40 text-xs">
                    No stocks match this filter.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((row, idx) => {
                  const p = row.price_1d_pct || 0;
                  const oi = row.oi_1d_pct || 0;
                  const inflow = row.fresh_inflow_1d_cr || 0;

                  return (
                    <tr
                      key={row.symbol}
                      onClick={() => router.push(`/chart?symbol=${encodeURIComponent(row.symbol)}`)}
                      className="border-b border-surface-border transition-colors cursor-pointer group hover:bg-surface-hover/60 text-xs"
                    >
                      {/* # Index */}
                      <td className="py-2 px-3.5 text-center text-foreground/30 text-[11px] hidden sm:table-cell">
                        {idx + 1}
                      </td>

                      {/* Symbol */}
                      <td className="py-2 px-3.5 font-bold text-foreground">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row.state === "LONGS"
                                    ? "bg-emerald-500"
                                  : row.state === "SHORTS"
                                  ? "bg-rose-500"
                                  : row.state === "UNWINDING"
                                  ? "bg-amber-500"
                                  : "bg-surface-border"
                              }`}
                            />
                            <span className="text-xs tracking-wider">{row.symbol}</span>
                          </div>

                          <Link
                            href={`/chart?symbol=${encodeURIComponent(row.symbol)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
                            title={`Open ${row.symbol} Chart`}
                          >
                            <LineChart className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-2 px-3.5 text-right font-mono text-foreground">
                        ₹{row.fut_close.toFixed(2)}
                      </td>

                      {/* Price Move % (Subdued Green/Red Tint) */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold">
                        <span
                          className={
                            p > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : p < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground/60"
                          }
                        >
                          {p >= 0 ? "+" : ""}
                          {p.toFixed(2)}%
                        </span>
                      </td>

                      {/* OI % */}
                      <td className="py-2 px-3.5 text-right font-mono text-foreground/70">
                        {oi >= 0 ? "+" : ""}
                        {oi.toFixed(1)}%
                      </td>

                      {/* 1D Rupee Inflow */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-foreground">
                        <span className={inflow > 0 ? "text-foreground" : "text-foreground/40"}>
                          {inflow >= 0 ? "+" : ""}₹{inflow.toFixed(1)} Cr
                        </span>
                      </td>

                      {/* 3D Rupee Inflow */}
                      <td className="py-2 px-3.5 text-right font-mono text-foreground/50 hidden md:table-cell">
                        {row.fresh_inflow_3d_cr ? `₹${row.fresh_inflow_3d_cr.toFixed(0)} Cr` : "-"}
                      </td>

                      {/* Total Notional */}
                      <td className="py-2 px-3.5 text-right font-mono text-foreground/50 hidden lg:table-cell">
                        ₹{row.total_notional_cr ? row.total_notional_cr.toFixed(0) : "0"} Cr
                      </td>

                      {/* Action / Stance Badge (Radar Style) */}
                      <td className="py-2 px-3.5 text-center">
                        {row.state === "LONGS" ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-foreground text-background shadow-xs tracking-wider">
                            LONG
                          </span>
                        ) : row.state === "SHORTS" ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded border border-foreground/40 text-foreground tracking-wider">
                            SHORT
                          </span>
                        ) : row.state === "UNWINDING" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-muted text-amber-500/90 border border-surface-border tracking-wider">
                            UNWIND
                          </span>
                        ) : row.state === "COVERING" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-muted text-blue-500/90 border border-surface-border tracking-wider">
                            COVER
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-muted text-foreground/40 border border-surface-border tracking-wider">
                            WAIT
                          </span>
                        )}
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
  </div>
  );
}
