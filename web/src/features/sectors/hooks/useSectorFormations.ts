import { useState, useMemo, useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { SectorSortField, SectorItemWithStocks } from "../types";

export function useSectorFormations() {
  const { sectors, snapshot, init } = useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  const [sortField, setSortField] = useState<SectorSortField>("pct_above_vwap");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

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

  // Group stocks into sectors
  const enrichedSectors: SectorItemWithStocks[] = useMemo(() => {
    const allStocks = snapshot?.stocks || [];
    return sectors.map((sec) => {
      const secStocks = allStocks.filter((s) => s.sector === sec.sector);
      const advances = secStocks.filter((s) => s.move_pct > 0).length;
      const declines = secStocks.filter((s) => s.move_pct < 0).length;
      return {
        ...sec,
        stocks: secStocks,
        advances,
        declines,
      };
    });
  }, [sectors, snapshot]);

  const sortedSectors = useMemo(() => {
    return enrichedSectors
      .filter((s) => {
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
  }, [enrichedSectors, search, sortField, sortAsc]);

  return {
    sectors: enrichedSectors,
    sortedSectors,
    sortField,
    sortAsc,
    handleSort,
    search,
    setSearch,
    expandedSector,
    toggleExpand,
  };
}
