import { useState, useMemo, useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { SectorSortField, SectorItemWithStocks, SectorPreset } from "../types";

export function useSectorFormations() {
  const { sectors, snapshot, init } = useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  const [preset, setPreset] = useState<SectorPreset>("ALL");
  const [sortField, setSortField] = useState<SectorSortField>("avg_move_pct");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const handleSelectPreset = (newPreset: SectorPreset) => {
    setPreset(newPreset);
    if (newPreset === "LEADERS") {
      setSortField("avg_move_pct");
      setSortAsc(false); // Highest positive average move first
    } else if (newPreset === "LAGGARDS") {
      setSortField("avg_move_pct");
      setSortAsc(true); // Biggest negative average drop first
    } else if (newPreset === "SURGES") {
      setSortField("avg_rvol");
      setSortAsc(false); // Highest relative volume first
    }
  };

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleExpand = (sector: string) => {
    setExpandedSector(expandedSector === sector ? null : sector);
  };

  // Group and enrich stocks into sectors with top driver/drag
  const enrichedSectors: SectorItemWithStocks[] = useMemo(() => {
    const allStocks = snapshot?.stocks || [];
    return sectors.map((sec) => {
      const secStocks = allStocks
        .filter((s) => s.sector === sec.sector)
        .sort((a, b) => (b.move_pct || 0) - (a.move_pct || 0));

      const advances = secStocks.filter((s) => (s.move_pct || 0) > 0).length;
      const declines = secStocks.filter((s) => (s.move_pct || 0) < 0).length;

      return {
        ...sec,
        stocks: secStocks,
        advances,
        declines,
        topGainer: secStocks[0],
        topLoser: secStocks[secStocks.length - 1],
      };
    });
  }, [sectors, snapshot]);

  const sortedSectors = useMemo(() => {
    return enrichedSectors
      .filter((s) => {
        // Presets filtering: Pure change % without VWAP gating
        if (preset === "LEADERS" && (s.avg_move_pct || 0) <= 0) return false;
        if (preset === "LAGGARDS" && (s.avg_move_pct || 0) >= 0) return false;
        if (preset === "SURGES" && (s.avg_rvol || 0) < 1.8) return false;

        if (!search) return true;
        const q = search.toLowerCase();
        return (
          s.sector.toLowerCase().includes(q) ||
          s.stocks?.some((st) => st.symbol.toLowerCase().includes(q))
        );
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
  }, [enrichedSectors, preset, search, sortField, sortAsc]);

  return {
    sectors: enrichedSectors,
    sortedSectors,
    preset,
    setPreset: handleSelectPreset,
    sortField,
    sortAsc,
    handleSort,
    search,
    setSearch,
    expandedSector,
    toggleExpand,
  };
}
