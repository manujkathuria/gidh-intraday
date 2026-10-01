import { useState, useMemo, useEffect } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { SortField, RadarPreset, VwapFilter } from "../types";
import { useRadarWebSocket } from "./useRadarWebSocket";
import { ReplayStock } from "@/lib/api";

export function useRadarFilters() {
  const { snapshot, selectedSymbol, setSelectedSymbol, init } = useMarketStore();

  useEffect(() => {
    init();
  }, [init]);

  useRadarWebSocket();

  const [preset, setPreset] = useState<RadarPreset>("ALL");
  const [vwapFilter, setVwapFilter] = useState<VwapFilter>("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rvol");
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = snapshot?.stocks || [];

  const handleSelectPreset = (newPreset: RadarPreset) => {
    setPreset(newPreset);
    if (newPreset === "SURGES") {
      setSortField("rvol");
      setSortAsc(false);
    }
  };

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
        // 1. Preset filter
        if (preset === "SURGES" && (s.rvol || 0) < 2.5) return false;

        // 2. VWAP Band filter
        // If vwap_sigma exists, use it; otherwise fallback to vwap_dist_pct approximation
        const sigma = s.vwap_sigma ?? (s.vwap && s.vwap > 0 ? (s.price - s.vwap) / (s.vwap * 0.0075) : 0);
        const distPct = s.vwap_dist_pct ?? 0;

        if (vwapFilter === "NEAR_VWAP") {
          // Near VWAP: within ±0.5 sigma (or ±0.35% distance)
          if (Math.abs(sigma) > 0.5 && Math.abs(distPct) > 0.35) return false;
        } else if (vwapFilter === "ABOVE_1S") {
          // Above +1 Sigma
          if (sigma < 1.0) return false;
        } else if (vwapFilter === "ABOVE_2S") {
          // Above +2 Sigma
          if (sigma < 2.0) return false;
        } else if (vwapFilter === "BELOW_1S") {
          // Below -1 Sigma
          if (sigma > -1.0) return false;
        } else if (vwapFilter === "BELOW_2S") {
          // Below -2 Sigma
          if (sigma > -2.0) return false;
        }

        // 3. Search query
        const query = search.toLowerCase().trim();
        if (query && !s.symbol.toLowerCase().includes(query)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        if (sortField === "pts") {
          const moveA = a.move_pct || 0;
          const priceA = a.price || 0;
          valA = (100 + moveA !== 0) ? (priceA * moveA) / (100 + moveA) : 0;

          const moveB = b.move_pct || 0;
          const priceB = b.price || 0;
          valB = (100 + moveB !== 0) ? (priceB * moveB) / (100 + moveB) : 0;
        } else if (sortField === "pd_context") {
          const pdhA = a.pdh || 0;
          const pdlA = a.pdl || 0;
          const priceA = a.price || 0;
          valA = pdhA > 0 && priceA > pdhA ? ((priceA - pdhA) / pdhA) * 100 : (pdlA > 0 && priceA < pdlA ? ((priceA - pdlA) / pdlA) * 100 : 0);

          const pdhB = b.pdh || 0;
          const pdlB = b.pdl || 0;
          const priceB = b.price || 0;
          valB = pdhB > 0 && priceB > pdhB ? ((priceB - pdhB) / pdhB) * 100 : (pdlB > 0 && priceB < pdlB ? ((priceB - pdlB) / pdlB) * 100 : 0);
        } else if (sortField === "futures_oi") {
          valA = a.oi_latest ?? 0;
          valB = b.oi_latest ?? 0;
        } else if (sortField === "symbol") {
          valA = a.symbol || "";
          valB = b.symbol || "";
        } else {
          valA = (a[sortField as keyof ReplayStock] as number) ?? 0;
          valB = (b[sortField as keyof ReplayStock] as number) ?? 0;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [stocks, preset, vwapFilter, search, sortField, sortAsc]);

  return {
    stocks,
    preset,
    setPreset: handleSelectPreset,
    vwapFilter,
    setVwapFilter,
    search,
    setSearch,
    sortField,
    sortAsc,
    handleSort,
    selectedSymbol,
    setSelectedSymbol,
    filteredAndSorted,
  };
}
