import { useState, useMemo, useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { SortField, RadarPreset, SectorOption } from "../types";

export function useRadarFilters() {
  const { snapshot, selectedSymbol, setSelectedSymbol, sectors, init } =
    useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  const [preset, setPreset] = useState<RadarPreset>("ALL");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rvol");
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = snapshot?.stocks || [];

  const sectorOptions: SectorOption[] = useMemo(() => {
    // Sort sectors numerically descending by avg_move_pct (highest positive gain at top, lowest negative at bottom)
    const sortedSectors = [...sectors].sort((a, b) => {
      const moveA = a.avg_move_pct ?? 0;
      const moveB = b.avg_move_pct ?? 0;
      return moveB - moveA;
    });

    return [
      {
        sector: "ALL",
        label: "All Sectors",
        count: stocks.length,
        avgMovePct: 0,
      },
      ...sortedSectors.map((s) => ({
        sector: s.sector,
        label: s.sector,
        count: s.civ_count,
        avgMovePct: s.avg_move_pct,
      })),
    ];
  }, [sectors, stocks.length]);

  const handleSelectPreset = (newPreset: RadarPreset) => {
    setPreset(newPreset);
    if (newPreset === "LEADERS") {
      setSortField("move_pct");
      setSortAsc(false); // Top positive gains first
    } else if (newPreset === "DUMPERS") {
      setSortField("move_pct");
      setSortAsc(true); // Biggest negative drops first
    } else if (newPreset === "SURGES") {
      setSortField("rvol");
      setSortAsc(false); // Highest relative volume first
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
        if (selectedSector !== "ALL" && s.sector !== selectedSector) return false;

        // Spectator Presets
        if (preset === "SURGES" && (s.rvol || 0) < 2.5) return false;
        if (preset === "LEADERS" && (!s.is_above_vwap || (s.move_pct || 0) <= 0)) return false;
        if (preset === "DUMPERS" && (s.is_above_vwap || (s.move_pct || 0) >= 0)) return false;

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
  }, [stocks, selectedSector, preset, search, sortField, sortAsc]);

  return {
    stocks,
    preset,
    setPreset: handleSelectPreset,
    selectedSector,
    setSelectedSector,
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
