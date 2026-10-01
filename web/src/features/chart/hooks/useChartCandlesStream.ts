import { useEffect, useState, useRef } from "react";
import { fetchMultiIntervalCandles, Candle, getStreamWsUrlWithAuth } from "@/lib/api";
import { fetchMacroDaily } from "@/lib/api_quant";
import { useChartIndicatorStore } from "@/stores/chartIndicatorStore";
import { ChartInterval, aggregateCandles } from "../components/candleAggregator";
import { computeVwapBands } from "../components/vwapCalculator";

export function useChartCandlesStream(
  activeSymbol: string,
  selectedDate: string,
  interval: ChartInterval,
  sessions: string[]
) {
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const raw1mCandlesRef = useRef<Candle[]>([]);
  const dailyLookback = useChartIndicatorStore((s) => s.dailyLookback);

  useEffect(() => {
    if (!selectedDate || !activeSymbol) return;

    let isSubscribed = true;
    setLoadingCandles(true);

    if (interval === "1d") {
      fetchMacroDaily(activeSymbol, selectedDate, dailyLookback || 120)
        .then((dailyData) => {
          if (!isSubscribed) return;
          const candles: Candle[] = (dailyData || []).map((d) => {
            const dateObj = new Date(`${d.date}T00:00:00Z`);
            const timeSec = Math.floor(dateObj.getTime() / 1000);
            return {
              time: timeSec,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
              vwap: 0,
              pwh: d.pwh,
              pwl: d.pwl,
              clv: d.clv,
            };
          });
          setChartCandles(candles);
          setLoadingCandles(false);
        })
        .catch((err) => {
          console.error("Error fetching daily macro candles:", err);
          if (isSubscribed) setLoadingCandles(false);
        });
      return () => {
        isSubscribed = false;
      };
    }

    fetchMultiIntervalCandles(activeSymbol, selectedDate, "1m")
      .then((data) => {
        if (!isSubscribed) return;
        const raw1m = data || [];
        raw1mCandlesRef.current = raw1m;
        const enriched1m = computeVwapBands(raw1m);
        const aggregated = interval === "1m" ? enriched1m : aggregateCandles(enriched1m, interval);
        setChartCandles(aggregated);
        setLoadingCandles(false);
      })
      .catch((err) => {
        console.error("Error fetching candles:", err);
        if (isSubscribed) setLoadingCandles(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedDate, activeSymbol, interval]);

  useEffect(() => {
    if (!activeSymbol) return;
    const latestDate = sessions[0];
    if (selectedDate && latestDate && selectedDate !== latestDate) return;

    let ws: WebSocket | null = null;
    let isMounted = true;

    async function connect() {
      try {
        const wsUrl = await getStreamWsUrlWithAuth(`/v1/stream/chart?symbol=${encodeURIComponent(activeSymbol)}`);
        if (!isMounted) return;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "SUBSCRIBE_SYMBOL", symbol: activeSymbol }));
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const tick = JSON.parse(event.data);
            if (tick && tick.symbol === activeSymbol && typeof tick.price === "number") {
              const raw1m = raw1mCandlesRef.current;
              if (raw1m.length > 0) {
                const last1m = raw1m[raw1m.length - 1];
                const updated1m: Candle = {
                  ...last1m,
                  close: tick.price,
                  high: Math.max(last1m.high, tick.price),
                  low: Math.min(last1m.low, tick.price),
                  vwap: tick.vwap && tick.vwap > 0 ? tick.vwap : last1m.vwap,
                };
                const nextRaw1m = [...raw1m.slice(0, -1), updated1m];
                raw1mCandlesRef.current = nextRaw1m;
                const enriched1m = computeVwapBands(nextRaw1m);
                const aggregated = interval === "1m" ? enriched1m : aggregateCandles(enriched1m, interval);
                setChartCandles(aggregated);
              }
            }
          } catch {
            // ignore
          }
        };
      } catch (e) {
        console.warn("WebSocket stream connection error:", e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [activeSymbol, selectedDate, sessions]);

  return { chartCandles, setChartCandles, loadingCandles };
}
