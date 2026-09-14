"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  UTCTimestamp,
} from "lightweight-charts";
import { Candle } from "@/lib/api";

interface CandlestickChartProps {
  candles: Candle[];
  symbol: string;
  theme?: "dark" | "light";
  height?: number;
}

export const AdvancedCandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  symbol,
  theme = "dark",
  height = 560,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: height,
      layout: {
        background: { color: isDark ? "#09090b" : "#ffffff" },
        textColor: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
        horzLines: { color: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" },
      },
      crosshair: {
        vertLine: {
          color: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
          width: 1,
          style: 3,
        },
        horzLine: {
          color: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
          width: 1,
          style: 3,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        scaleMargins: {
          top: 0.08,
          bottom: 0.22, // Space for volume sub-panel
        },
      },
    });

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    // 2. VWAP Series (Amber Line)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "VWAP",
      priceLineVisible: true,
    });

    // 3. Volume Histogram Series (Bottom overlay)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Draw on separate scale overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.80, // Volume occupies bottom 20%
        bottom: 0,
      },
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries as any;
    vwapSeriesRef.current = vwapSeries as any;
    volumeSeriesRef.current = volumeSeries as any;

    const handleResize = () => {
      if (container && chart) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight || height,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        chart.remove();
      } catch (e) {
        // ignore if already disposed
      }
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      vwapSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isDark, height]);

  // Update chart data whenever candles prop updates
  useEffect(() => {
    if (
      !candleSeriesRef.current ||
      !vwapSeriesRef.current ||
      !volumeSeriesRef.current ||
      !candles ||
      candles.length === 0
    ) {
      return;
    }

    const validCandles = candles.filter((c) => typeof c.time === "number" && !isNaN(c.time));
    if (validCandles.length === 0) return;

    // Deduplicate candles by timestamp
    const uniqueMap = new Map<number, Candle>();
    validCandles.forEach((c) => uniqueMap.set(c.time, c));
    const sortedCandles = Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);

    const candleData = sortedCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const vwapData = sortedCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.vwap,
    }));

    const volumeData = sortedCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)",
    }));

    try {
      candleSeriesRef.current.setData(candleData);
      vwapSeriesRef.current.setData(vwapData);
      volumeSeriesRef.current.setData(volumeData);
    } catch (err) {
      console.warn("Chart setData warning:", err);
    }
  }, [candles]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        ref={chartContainerRef}
        className="w-full flex-1 rounded-lg overflow-hidden border border-surface-border"
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
};
