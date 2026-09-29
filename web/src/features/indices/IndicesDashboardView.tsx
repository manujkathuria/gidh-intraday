"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { fetchIndicesDashboard } from "@/lib/api_market";
import { IndicesDashboardResponse, IndexItem } from "@/lib/types_market";
import { IndexCategoryFilter, IndexSortField } from "./types";
import { IndicesFilterBar } from "./components/IndicesFilterBar";
import { IndicesTableHeader } from "./components/IndicesTableHeader";
import { IndicesTableRow } from "./components/IndicesTableRow";
import { IndicesMobileCard } from "./components/IndicesMobileCard";

export const IndicesDashboardView: React.FC = () => {
  const { selectedDate, init } = useMarketStore();
  const [data, setData] = useState<IndicesDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter and Sort states
  const [category, setCategory] = useState<IndexCategoryFilter>("ALL");
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<IndexSortField>("change_pct");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    init();
  }, [init]);

  const loadData = useCallback(async (targetDate?: string) => {
    setLoading(true);
    try {
      const res = await fetchIndicesDashboard(targetDate);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load indices dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  // Handle Sort
  const handleSort = (field: IndexSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "symbol");
    }
  };

  // Compile Unified List of all indices
  const allIndices = useMemo<IndexItem[]>(() => {
    if (!data) return [];

    const list: IndexItem[] = [];

    // Global Cues & Volatility
    if (data.gift_nifty) {
      list.push({
        symbol: "GIFT NIFTY",
        name: "NSE International Index (Gift City)",
        category: "GLOBAL_CUE",
        spot_price: data.gift_nifty.price,
        prev_close: data.gift_nifty.nifty_prev_close,
        change_pts: data.gift_nifty.gap_pts,
        change_pct: data.gift_nifty.gap_pct,
      });
    }
    if (data.india_vix) {
      list.push({
        symbol: "INDIA VIX",
        name: "India Volatility Index",
        category: "VOLATILITY",
        spot_price: data.india_vix.value,
        prev_close: data.india_vix.value / (1 + (data.india_vix.change_pct || 0) / 100),
        change_pts: 0,
        change_pct: data.india_vix.change_pct,
      });
    }

    // Benchmarks
    if (data.benchmarks) {
      data.benchmarks.forEach((b) => {
        if (!list.some((item) => item.symbol === b.symbol)) {
          list.push({
            ...b,
            category: "BENCHMARK",
          });
        }
      });
    }

    // Sectors
    if (data.sector_indices) {
      data.sector_indices.forEach((s) => {
        if (!list.some((item) => item.symbol === s.symbol)) {
          list.push({
            ...s,
            category: "SECTOR",
          });
        }
      });
    }

    // Additional generic indices array if provided
    if (data.indices) {
      data.indices.forEach((idx) => {
        if (!list.some((item) => item.symbol === idx.symbol)) {
          list.push(idx);
        }
      });
    }

    return list;
  }, [data]);

  // Filter & Sort Indices
  const filteredIndices = useMemo(() => {
    let result = [...allIndices];

    // Filter by Category
    if (category !== "ALL") {
      if (category === "SPECIAL") {
        result = result.filter(
          (i) => i.category === "GLOBAL_CUE" || i.category === "VOLATILITY"
        );
      } else {
        result = result.filter((i) => i.category === category);
      }
    }

    // Filter by Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.symbol.toLowerCase().includes(q) ||
          (i.name && i.name.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField] ?? 0;
      let valB: any = b[sortField] ?? 0;

      if (typeof valA === "string") {
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [allIndices, category, search, sortField, sortAsc]);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Radar-style Filter & Navigation Bar */}
      <IndicesFilterBar
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
        loading={loading}
        onRefresh={() => loadData(selectedDate)}
        visibleCount={filteredIndices.length}
        totalCount={allIndices.length}
      />

      {/* 2. Mobile View: Flat list (< md) matching RadarMobileCard */}
      <div className="md:hidden flex flex-col divide-y divide-surface-border/40">
        {loading && allIndices.length === 0 ? (
          <div className="py-12 text-center text-foreground/40 text-xs">
            Loading indices pulse...
          </div>
        ) : filteredIndices.length === 0 ? (
          <div className="py-12 text-center text-foreground/40 text-xs">
            No indices match this filter.
          </div>
        ) : (
          filteredIndices.map((row) => (
            <IndicesMobileCard key={row.symbol} row={row} />
          ))
        )}
      </div>

      {/* 3. iPad / Desktop View: High-Density Flat Table matching RadarLeaderboard */}
      <div className="hidden md:block w-full">
        <div className="overflow-x-auto max-h-[calc(100vh-120px)] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <IndicesTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
            <tbody className="divide-y divide-surface-border/30">
              {loading && allIndices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/40 text-xs">
                    Loading indices pulse...
                  </td>
                </tr>
              ) : filteredIndices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/40 text-xs">
                    No indices match this filter.
                  </td>
                </tr>
              ) : (
                filteredIndices.map((row, idx) => (
                  <IndicesTableRow key={row.symbol} row={row} index={idx} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
