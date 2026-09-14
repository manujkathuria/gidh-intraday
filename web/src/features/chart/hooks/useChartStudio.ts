import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReplayStore, formatMinutesToTime } from "@/stores/replayStore";
import { fetchReplayCandles, Candle } from "@/lib/api";
import { StockSummaryItem } from "../types";

export function useChartStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const {
    selectedDate,
    currentTimeMinutes,
    snapshot,
    selectedSymbol,
    setSelectedSymbol,
    init,
  } = useReplayStore();

  const [activeSymbol, setActiveSymbol] = useState<string>(
    urlSymbol || selectedSymbol || "RELIANCE"
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains("dark");
      setTheme(darkNow ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (urlSymbol && urlSymbol !== activeSymbol) {
      setActiveSymbol(urlSymbol);
      setSelectedSymbol(urlSymbol);
    }
  }, [urlSymbol, activeSymbol, setSelectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSelectedSymbol(sym);
    router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
  };

  useEffect(() => {
    if (!selectedDate || !activeSymbol) return;

    let isSubscribed = true;
    const toTimeStr = formatMinutesToTime(currentTimeMinutes);

    setLoadingCandles(true);
    fetchReplayCandles(selectedDate, activeSymbol, toTimeStr)
      .then((data) => {
        if (isSubscribed) {
          setChartCandles(data);
          setLoadingCandles(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching candles:", err);
        if (isSubscribed) setLoadingCandles(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedDate, activeSymbol, currentTimeMinutes]);

  const stockInfo = useMemo(() => {
    return snapshot?.stocks?.find((s) => s.symbol === activeSymbol);
  }, [snapshot, activeSymbol]);

  const allSymbols: StockSummaryItem[] = useMemo(() => {
    if (!snapshot?.stocks) return [];
    return snapshot.stocks.map((s) => ({
      symbol: s.symbol,
      sector: s.sector,
      move_pct: s.move_pct,
      price: s.price,
      rvol: s.rvol,
      clv: s.clv,
    }));
  }, [snapshot]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return allSymbols;
    const lower = searchTerm.toLowerCase();
    return allSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(lower) ||
        s.sector.toLowerCase().includes(lower)
    );
  }, [allSymbols, searchTerm]);

  return {
    activeSymbol,
    handleSelectSymbol,
    searchTerm,
    setSearchTerm,
    chartCandles,
    loadingCandles,
    theme,
    selectedDate,
    currentTimeMinutes,
    stockInfo,
    allSymbols,
    filteredSymbols,
  };
}
