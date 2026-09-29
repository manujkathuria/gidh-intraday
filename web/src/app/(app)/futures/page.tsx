"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { fetchFuturesInflow, FuturesInflowItem as FuturesItem } from "@/lib/api";
import { SortField } from "@/features/futures/types";
import { FuturesFilterBar } from "@/features/futures/components/FuturesFilterBar";
import { FuturesTable } from "@/features/futures/components/FuturesTable";

export default function FuturesPage() {
  const { selectedDate, init } = useMarketStore();
  const [data, setData] = useState<FuturesItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Sort State
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("fresh_inflow_1d_cr");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    init();
  }, [init]);

  const loadData = useCallback(async (targetDate?: string) => {
    setLoading(true);
    try {
      const json = await fetchFuturesInflow(targetDate ? { date: targetDate } : undefined);
      if (json && json.data) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Failed to load futures data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        const matchTrading = (item.trading_symbol || "").toLowerCase().includes(q);
        return matchSymbol || matchTrading;
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
  }, [data, search, sortField, sortAsc]);

  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col gap-3">
      <FuturesFilterBar
        search={search}
        setSearch={setSearch}
        loading={loading}
        onRefresh={() => loadData(selectedDate)}
        visibleCount={filteredData.length}
        totalCount={data.length}
      />

      <FuturesTable
        data={filteredData}
        loading={loading}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
      />
    </div>
  );
}
