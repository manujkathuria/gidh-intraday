import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMarketStore } from "@/stores/marketStore";
import { fetchMultiIntervalCandles, Candle, getStreamWsUrl } from "@/lib/api";
import { StockSummaryItem } from "../types";
import { ChartInterval } from "../components/candleAggregator";

export function useChartStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const {
    sessions,
    selectedDate,
    snapshot,
    selectedSymbol,
    setSelectedSymbol,
    init,
  } = useMarketStore();

  const [activeSymbol, setActiveSymbol] = useState<string>(
    urlSymbol || selectedSymbol || "RELIANCE"
  );
  const [interval, setInterval] = useState<ChartInterval>("5m");
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
    const target = urlSymbol || selectedSymbol;
    if (target) {
      if (target !== activeSymbol) {
        setActiveSymbol(target);
      }
      if (target !== selectedSymbol) {
        setSelectedSymbol(target);
      }
    }
  }, [urlSymbol, selectedSymbol, activeSymbol, setSelectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSelectedSymbol(sym);
    router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
  };

  useEffect(() => {
    if (!selectedDate || !activeSymbol) return;

    let isSubscribed = true;
    setLoadingCandles(true);

    fetchMultiIntervalCandles(activeSymbol, selectedDate, interval)
      .then((data) => {
        if (isSubscribed) {
          setChartCandles(data || []);
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
  }, [selectedDate, activeSymbol, interval]);

  // Connect on-demand 1Hz Chart WebSocket stream
  useEffect(() => {
    if (!activeSymbol) return;

    // If user is reviewing an older historical date, do NOT stream live ticks into historical chart
    const latestDate = sessions[0];
    if (selectedDate && latestDate && selectedDate !== latestDate) {
      return;
    }

    let ws: WebSocket | null = null;
    let isMounted = true;

    try {
      const url = getStreamWsUrl(`/v1/stream/chart?symbol=${encodeURIComponent(activeSymbol)}`);
      ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.candle) {
            const liveCandle: Candle = data.candle;
            setChartCandles((prev) => {
              if (prev.length === 0) return [liveCandle];
              const last = prev[prev.length - 1];
              if (last.time === liveCandle.time) {
                // Update latest bar in place
                return [...prev.slice(0, -1), liveCandle];
              } else if (liveCandle.time > last.time) {
                // Append newly formed bar
                return [...prev, liveCandle];
              }
              return prev;
            });
          }
        } catch (e) {
          // ignore non-json
        }
      };
    } catch (e) {
      console.warn("[Chart WS] connection failed:", e);
    }

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, [activeSymbol, selectedDate, sessions]);

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
    currentTimeMinutes: 930,
    stockInfo,
    allSymbols,
    filteredSymbols,
    mode: "COMPLETED",
  };
}
