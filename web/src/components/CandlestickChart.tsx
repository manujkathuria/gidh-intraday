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
import { useReplayStore } from "@/stores/replayStore";
import { BarChart2 } from "lucide-react";

export const CandlestickChart: React.FC = () => {
  const { selectedSymbol, candles, snapshot } = useReplayStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const stockInfo = snapshot?.stocks?.find((s) => s.symbol === selectedSymbol);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 400,
      height: container.clientHeight || 300,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        vertLine: { color: "rgba(99, 102, 241, 0.5)", width: 1 },
        horzLine: { color: "rgba(99, 102, 241, 0.5)", width: 1 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "VWAP",
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries as any;
    vwapSeriesRef.current = vwapSeries as any;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !vwapSeriesRef.current || !candles || candles.length === 0) return;

    const validCandles = candles.filter((c) => typeof c.time === "number" && !isNaN(c.time));
    if (validCandles.length === 0) return;

    // Deduplicate and format data
    const candleData = validCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const vwapData = validCandles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.vwap,
    }));

    try {
      candleSeriesRef.current.setData(candleData);
      vwapSeriesRef.current.setData(vwapData);

      if (chartApiRef.current) {
        chartApiRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error("Failed to set chart data:", err);
    }
  }, [candles]);

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
      {/* Chart Header */}
      <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white tracking-wide">
              {selectedSymbol}
            </span>
          </div>

          {stockInfo && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">{stockInfo.sector}</span>
              <span
                className={`text-xs font-mono font-bold ${
                  (stockInfo.move_pct || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {(stockInfo.move_pct || 0) >= 0 ? "+" : ""}
                {Number(stockInfo.move_pct || 0).toFixed(2)}%
              </span>
              <span className="text-xs text-white/40 font-mono">
                ₹{Number(stockInfo.price || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-white/60">Bull</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-white/60">Bear</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="text-amber-400 font-bold">VWAP</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-0 relative" ref={chartContainerRef} />
    </div>
  );
};
