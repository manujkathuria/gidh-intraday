import { useState, useMemo, useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { SortField, VwapFilter } from "../types";

export function useRadarFilters() {
  const { snapshot, selectedSymbol, setSelectedSymbol, sectors, init } =
    useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  const [selectedSector, setSelectedSector] = useState("ALL");
  const [minRvol, setMinRvol] = useState<number>(0);
  const [vwapFilter, setVwapFilter] = useState<VwapFilter>("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rvol");
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = snapshot?.stocks || [];

  const sectorOptions = useMemo(() => {
    return [
      { sector: "ALL", label: `All Sectors (${stocks.length})` },
      ...sectors.map((s) => ({
        sector: s.sector,
        label: `${s.sector} (${s.civ_count}) · ${
          s.avg_move_pct >= 0 ? "+" : ""
        }${s.avg_move_pct.toFixed(1)}% · ${s.pct_above_vwap.toFixed(0)}% VWAP`,
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
        if (selectedSector !== "ALL" && s.sector !== selectedSector)
          return false;
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

        return sortAsc
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [stocks, selectedSector, minRvol, vwapFilter, search, sortField, sortAsc]);

  return {
    stocks,
    selectedSector,
    setSelectedSector,
    minRvol,
    setMinRvol,
    vwapFilter,
    setVwapFilter,
    search,
    setSearch,
    sortField,
    sortAsc,
    handleSort,
    selectedSymbol,
    setSelectedSymbol,
    sectorOptions,
    filteredAndSorted,
  };
}
