"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  UTCTimestamp,
} from "lightweight-charts";
import { ChartProps } from "../types";
import { getChartOptions, CANDLE_COLORS } from "./chartOptions";

export const CandlestickCanvas: React.FC<ChartProps> = ({
  candles,
  symbol,
  theme = "dark",
  interval = "1m",
  selectedDate = "",
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastKeyRef = useRef<string>("");
  const isDark = theme === "dark";
  const isIntraday = interval === "1m" || interval === "5m" || interval === "15m";

  // 1. Initialize Chart Canvas ONCE on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    const chart = createChart(container, getChartOptions(isDark, interval, width, height));
    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: true,
      borderUpColor: colors.borderUpColor,
      borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: colors.vwapColor,
      lineWidth: 2,
      priceLineVisible: false,
      title: "VWAP",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries as any;
    vwapSeriesRef.current = vwapSeries as any;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && chartRef.current) {
          const { width: w, height: h } = entry.contentRect;
          if (w > 0 && h > 0) chartRef.current.applyOptions({ width: w, height: h });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // 2. Dynamically Update Theme & Interval formatting
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !vwapSeriesRef.current) return;
    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;

    chartRef.current.applyOptions(getChartOptions(isDark, interval));

    candleSeriesRef.current.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUpColor,
      borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });

    // VWAP only visible for intraday 1m/5m/15m
    vwapSeriesRef.current.applyOptions({
      color: colors.vwapColor,
      visible: isIntraday,
    });
  }, [isDark, interval, isIntraday]);

  // 3. Update Candles Data & Frame On Stock or Interval Switch
  useEffect(() => {
    if (!candleSeriesRef.current || !vwapSeriesRef.current || !chartRef.current) return;

    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(candleData);

    // Only supply VWAP data when intraday
    if (isIntraday) {
      const vwapData = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.vwap,
      }));
      vwapSeriesRef.current.setData(vwapData);
    } else {
      vwapSeriesRef.current.setData([]);
    }

    if (candleData.length > 0) {
      chartRef.current.priceScale("right").applyOptions({ autoScale: true });
      const currentKey = `${symbol}_${interval}_${selectedDate}`;
      if (lastKeyRef.current !== currentKey) {
        lastKeyRef.current = currentKey;
        const ts = chartRef.current.timeScale();
        ts.resetTimeScale();
        if (candleData.length <= 40) {
          // For shorter datasets, fit all candles neatly
          ts.fitContent();
        } else {
          // For richer datasets (e.g. 1d year history, 1h 10-day history), show the most recent ~60 bars with right breathing room
          ts.setVisibleLogicalRange({
            from: candleData.length - 60,
            to: candleData.length + 3,
          });
        }
      }
    }
  }, [candles, symbol, interval, selectedDate, isIntraday]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
};
