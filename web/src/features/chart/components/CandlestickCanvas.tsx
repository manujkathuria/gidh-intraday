"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  UTCTimestamp,
} from "lightweight-charts";
import { ChartProps } from "../types";

export const CandlestickCanvas: React.FC<ChartProps> = ({
  candles,
  symbol,
  theme = "dark",
  height = 580,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#A1A1AA" : "#71717A",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        autoScale: true,
      },
      crosshair: {
        vertLine: { color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
        horzLine: { color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? "#FAFAFA" : "#18181B",
      downColor: isDark ? "#71717A" : "#A1A1AA",
      borderVisible: true,
      borderUpColor: isDark ? "#FAFAFA" : "#18181B",
      borderDownColor: isDark ? "#71717A" : "#A1A1AA",
      wickUpColor: isDark ? "#FAFAFA" : "#18181B",
      wickDownColor: isDark ? "#71717A" : "#A1A1AA",
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: isDark ? "#F59E0B" : "#D97706",
      lineWidth: 2,
      priceLineVisible: false,
      title: "VWAP",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries as any;
    volumeSeriesRef.current = volumeSeries as any;
    vwapSeriesRef.current = vwapSeries as any;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [theme, height]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !vwapSeriesRef.current)
      return;

    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color:
        c.close >= c.open
          ? isDark
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.2)"
          : isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(0,0,0,0.08)",
    }));

    const vwapData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.vwap,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    vwapSeriesRef.current.setData(vwapData);
  }, [candles, isDark]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
};
