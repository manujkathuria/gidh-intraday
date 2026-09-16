import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMarketData } from "@/stores/useMarketData";
import { formatMinutesToTime } from "@/stores/replayStore";
import { fetchReplayCandles, Candle } from "@/lib/api";
import { StockSummaryItem } from "../types";
import {
  ChartInterval,
  aggregateCandles,
  mergeLiveCandleIntoHTF,
} from "../components/candleAggregator";

export function useChartStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const {
    mode,
    sessionDate: selectedDate,
    currentTimeMinutes,
    snapshot,
    candles,
    selectedSymbol,
    setSelectedSymbol,
    init,
  } = useMarketData();

  const [activeSymbol, setActiveSymbol] = useState<string>(
    urlSymbol || selectedSymbol || "RELIANCE"
  );
  const [interval, setInterval] = useState<ChartInterval>("5m");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [rawCandles, setRawCandles] = useState<Candle[]>([]);
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

    // For Intraday intervals (1m, 5m, 15m) in LIVE mode, liveStore provides real-time WebSocket stream
    if (mode === "LIVE" && (interval === "1m" || interval === "5m" || interval === "15m")) {
      return;
    }

    let isSubscribed = true;
    const toTimeStr = mode === "LIVE" ? "15:30:00" : formatMinutesToTime(currentTimeMinutes);

    setLoadingCandles(true);
    // For 1m, 5m, 15m: fetch today's 1m stream; for 1h / 1d fetch backend interval
    const fetchInt = interval === "1h" || interval === "1d" ? interval : "1m";

    fetchReplayCandles(selectedDate, activeSymbol, toTimeStr, fetchInt)
      .then((data) => {
        if (isSubscribed) {
          setRawCandles(data);
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
  }, [mode, selectedDate, activeSymbol, currentTimeMinutes, interval]);

  const chartCandles = useMemo(() => {
    if (interval === "1h" || interval === "1d") {
      if (mode === "LIVE") {
        return mergeLiveCandleIntoHTF(rawCandles, candles, interval);
      }
      return rawCandles;
    }

    const sourceCandles = mode === "LIVE" ? candles : rawCandles;
    return aggregateCandles(sourceCandles, interval);
  }, [mode, interval, rawCandles, candles]);

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
    interval,
    setInterval,
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
    mode,
  };
}
