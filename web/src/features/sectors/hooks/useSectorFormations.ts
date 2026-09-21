import { useState, useMemo, useEffect } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { getStreamWsUrl, getStreamWsUrlWithAuth } from "@/lib/api";
import { SectorSortField, SectorItemWithStocks, SectorPreset } from "../types";

export function useSectorFormations() {
  const { sectors, snapshot, init, setWsConnected, applyLiveSnapshot } = useMarketStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;
    async function connect() {
      try {
        const url = await getStreamWsUrlWithAuth("/v1/stream/sectors");
        if (!isMounted) return;
        ws = new WebSocket(url);
        ws.onopen = () => { if (isMounted) setWsConnected(true); };
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d?.sectors || d?.stocks || d?.weather) applyLiveSnapshot(d);
          } catch {}
        };
        ws.onclose = () => { if (isMounted) setWsConnected(false); };
        ws.onerror = () => { if (isMounted) setWsConnected(false); };
      } catch {}
    }

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
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
    if (newPreset === "LEADERS") { setSortField("avg_move_pct"); setSortAsc(false); }
    else if (newPreset === "LAGGARDS") { setSortField("avg_move_pct"); setSortAsc(true); }
    else if (newPreset === "SURGES" || newPreset === "ALL") { setSortField("avg_rvol"); setSortAsc(false); }
  };

  const handleSort = (field: SectorSortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const toggleExpand = (sec: string) => {
    setExpandedSector(expandedSector === sec ? null : sec);
  };

  // Group snapshot stocks by their canonical instrument sector
  const enrichedSectors: SectorItemWithStocks[] = useMemo(() => {
    const allStocks = snapshot?.stocks || [];
    if (allStocks.length === 0) return [];

    const map = new Map<string, typeof allStocks>();
    for (const s of allStocks) {
      const sec = (s.sector || "OTHERS").trim().toUpperCase();
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(s);
    }

    return Array.from(map.entries()).map(([secName, secStocks]) => {
      secStocks.sort((a, b) => (Number(b.move_pct) || 0) - (Number(a.move_pct) || 0));
      const advances = secStocks.filter((s) => (Number(s.move_pct) || 0) > 0).length;
      const declines = secStocks.filter((s) => (Number(s.move_pct) || 0) < 0).length;
      const sumMove = secStocks.reduce((sum, s) => sum + (Number(s.move_pct) || 0), 0);
      const sumRvol = secStocks.reduce((sum, s) => sum + (Number(s.rvol) || 1.0), 0);
      const aboveCount = secStocks.filter((s) => s.is_above_vwap).length;
      const matched = sectors.find((s) => (s.sector || "").trim().toUpperCase() === secName);

      return {
        sector: secName,
        civ_count: secStocks.length,
        avg_move_pct: matched?.avg_move_pct ?? (sumMove / secStocks.length),
        avg_rvol: matched?.avg_rvol ?? (sumRvol / secStocks.length),
        pct_above_vwap: matched?.pct_above_vwap ?? (secStocks.length > 0 ? Math.round((aboveCount / secStocks.length) * 100) : 0),
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
        return s.sector.toLowerCase().includes(q) || s.stocks?.some((st) => st.symbol.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (typeof valA === "string") {
          return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
        }
        const diff = sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        return Math.abs(diff) > 0.0001 ? diff : a.sector.localeCompare(b.sector);
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
