"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  LineStyle,
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
  const upper1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lower1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const upper2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lower2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
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
      lastValueVisible: true,
      title: "VWAP",
    });

    const upper1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const lower1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const upper2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const lower2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries as any;
    vwapSeriesRef.current = vwapSeries as any;
    upper1SeriesRef.current = upper1Series as any;
    lower1SeriesRef.current = lower1Series as any;
    upper2SeriesRef.current = upper2Series as any;
    lower2SeriesRef.current = lower2Series as any;

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
    if (
      !chartRef.current ||
      !candleSeriesRef.current ||
      !vwapSeriesRef.current ||
      !upper1SeriesRef.current ||
      !lower1SeriesRef.current ||
      !upper2SeriesRef.current ||
      !lower2SeriesRef.current
    )
      return;
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

    // VWAP & Sigma bands only visible for intraday 1m/5m/15m
    vwapSeriesRef.current.applyOptions({
      color: colors.vwapColor,
      visible: isIntraday,
    });

    upper1SeriesRef.current.applyOptions({
      color: colors.sigma1Color,
      visible: isIntraday,
    });

    lower1SeriesRef.current.applyOptions({
      color: colors.sigma1Color,
      visible: isIntraday,
    });

    upper2SeriesRef.current.applyOptions({
      color: colors.sigma2Color,
      visible: isIntraday,
    });

    lower2SeriesRef.current.applyOptions({
      color: colors.sigma2Color,
      visible: isIntraday,
    });
  }, [isDark, interval, isIntraday]);

  // 3. Update Candles Data & Frame On Stock or Interval Switch
  useEffect(() => {
    if (
      !candleSeriesRef.current ||
      !vwapSeriesRef.current ||
      !upper1SeriesRef.current ||
      !lower1SeriesRef.current ||
      !upper2SeriesRef.current ||
      !lower2SeriesRef.current ||
      !chartRef.current
    )
      return;

    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(candleData);

    // Only supply VWAP and Sigma bands data when intraday (1m, 5m, 15m)
    if (isIntraday) {
      const vwapData = candles
        .filter((c) => c.vwap && c.vwap > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap,
        }));
      vwapSeriesRef.current.setData(vwapData);

      const upper1Data = candles
        .filter((c) => c.vwap_upper_1 && c.vwap_upper_1 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_upper_1!,
        }));
      upper1SeriesRef.current.setData(upper1Data);

      const lower1Data = candles
        .filter((c) => c.vwap_lower_1 && c.vwap_lower_1 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_lower_1!,
        }));
      lower1SeriesRef.current.setData(lower1Data);

      const upper2Data = candles
        .filter((c) => c.vwap_upper_2 && c.vwap_upper_2 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_upper_2!,
        }));
      upper2SeriesRef.current.setData(upper2Data);

      const lower2Data = candles
        .filter((c) => c.vwap_lower_2 && c.vwap_lower_2 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_lower_2!,
        }));
      lower2SeriesRef.current.setData(lower2Data);
    } else {
      vwapSeriesRef.current.setData([]);
      upper1SeriesRef.current.setData([]);
      lower1SeriesRef.current.setData([]);
      upper2SeriesRef.current.setData([]);
      lower2SeriesRef.current.setData([]);
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

