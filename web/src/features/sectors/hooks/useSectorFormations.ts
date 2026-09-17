import { useState, useMemo, useEffect } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { getStreamWsUrl } from "@/lib/api";
import { SectorSortField, SectorItemWithStocks, SectorPreset } from "../types";

export function useSectorFormations() {
  const { sectors, snapshot, init, setWsConnected, applyLiveSnapshot } = useMarketStore();

  useEffect(() => {
    init();
  }, [init]);

  // Connect on-demand /v1/stream/sectors WebSocket stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    try {
      const url = getStreamWsUrl("/v1/stream/sectors");
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (isMounted) setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.sectors || data.stocks || data.weather)) {
            applyLiveSnapshot(data);
          }
        } catch (e) {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        if (isMounted) setWsConnected(false);
      };

      ws.onerror = () => {
        if (isMounted) setWsConnected(false);
      };
    } catch (e) {
      console.warn("[Sectors WS] connection error:", e);
    }

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      setWsConnected(false);
    };
  }, [setWsConnected, applyLiveSnapshot]);

  const [preset, setPreset] = useState<SectorPreset>("ALL");
  const [sortField, setSortField] = useState<SectorSortField>("avg_rvol");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  const handleSelectPreset = (newPreset: SectorPreset) => {
    setPreset(newPreset);
    if (newPreset === "LEADERS") {
      setSortField("avg_move_pct");
      setSortAsc(false);
    } else if (newPreset === "LAGGARDS") {
      setSortField("avg_move_pct");
      setSortAsc(true);
    } else if (newPreset === "SURGES" || newPreset === "ALL") {
      setSortField("avg_rvol");
      setSortAsc(false);
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

  const enrichedSectors: SectorItemWithStocks[] = useMemo(() => {
    const allStocks = snapshot?.stocks || [];
    return sectors.map((sec) => {
      const secName = (sec.sector || "").trim().toUpperCase();
      const secStocks = allStocks
        .filter((s) => (s.sector || "").trim().toUpperCase() === secName)
        .sort((a, b) => (Number(b.move_pct) || 0) - (Number(a.move_pct) || 0));

      const advances = secStocks.filter((s) => (Number(s.move_pct) || 0) > 0).length;
      const declines = secStocks.filter((s) => (Number(s.move_pct) || 0) < 0).length;

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
          const comp = (valA as string).localeCompare(valB as string);
          return sortAsc ? comp : -comp;
        }

        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        const diff = sortAsc ? numA - numB : numB - numA;

        if (Math.abs(diff) > 0.0001) {
          return diff;
        }

        return a.sector.localeCompare(b.sector);
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
