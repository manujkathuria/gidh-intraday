"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  Time,
} from "lightweight-charts";
import { MacroDailyCandle, MacroIntradayCandle, MacroLevelsData } from "@/lib/api_quant";
import { useChartMacroZones } from "@/features/chart/components/useChartMacroZones";

interface Props {
  mode: "INTRADAY" | "DAILY";
  dailyCandles: MacroDailyCandle[];
  intradayCandles: MacroIntradayCandle[];
  macroLevels?: MacroLevelsData | null;
  symbol: string;
  isDark?: boolean;
}

export const MacroChartCanvas: React.FC<Props> = ({
  mode,
  dailyCandles,
  intradayCandles,
  macroLevels,
  symbol,
  isDark = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const pwhSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const pwlSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const priceLinesRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 550,
      layout: {
        background: { color: "transparent" },
        textColor: isDark ? "#94A3B8" : "#64748B",
        fontSize: 11,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)" },
        horzLines: { color: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)" },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 1. Candlestick Series
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderUpColor: "#22C55E",
      borderDownColor: "#EF4444",
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });

    // 2. Intraday VWAP Line
    vwapSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#F59E0B",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "VWAP",
    });

    // 3. Daily PWH Line
    pwhSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#F87171",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "PWH",
    });

    // 4. Daily PWL Line
    pwlSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#34D399",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "PWL",
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      vwapSeriesRef.current = null;
      pwhSeriesRef.current = null;
      pwlSeriesRef.current = null;
    };
  }, [isDark]);

  // Data update & level synchronizer
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Clear old price lines
    Object.keys(priceLinesRef.current).forEach((key) => {
      if (priceLinesRef.current[key]) {
        series.removePriceLine(priceLinesRef.current[key]);
        delete priceLinesRef.current[key];
      }
    });

    if (mode === "INTRADAY") {
      // Hide daily lines
      pwhSeriesRef.current?.setData([]);
      pwlSeriesRef.current?.setData([]);

      if (intradayCandles.length > 0) {
        const cData = intradayCandles
          .map((c) => {
            const dateObj = new Date(c.ts_ist || c.ts);
            const timeSec = Math.floor(dateObj.getTime() / 1000) as Time;
            return {
              time: timeSec,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            };
          })
          .sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));

        series.setData(cData);

        // Populate rolling VWAP
        if (vwapSeriesRef.current) {
          const vData = intradayCandles
            .filter((c) => c.vwap && c.vwap > 0)
            .map((c) => {
              const dateObj = new Date(c.ts_ist || c.ts);
              return {
                time: Math.floor(dateObj.getTime() / 1000) as Time,
                value: c.vwap as number,
              };
            })
            .sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));
          vwapSeriesRef.current.setData(vData);
        }

        // Add Macro Price Lines
        const addLine = (key: string, price: number | null | undefined, color: string, style: LineStyle, width: number, title: string) => {
          if (price && price > 0) {
            priceLinesRef.current[key] = series.createPriceLine({
              price,
              color,
              lineStyle: style,
              lineWidth: width as any,
              axisLabelVisible: true,
              title,
            });
          }
        };

        const m = macroLevels;
        if (m) {
          addLine("pwh", m.pwh, "#EF4444", LineStyle.Dashed, 2, "PWH");
          addLine("pwl", m.pwl, "#22C55E", LineStyle.Dashed, 2, "PWL");
          addLine("pdh", m.pdh, "#FB923C", LineStyle.Dotted, 1, "PDH");
          addLine("pdl", m.pdl, "#38BDF8", LineStyle.Dotted, 1, "PDL");
          addLine("swing_res", m.swing_res, "#EF4444", LineStyle.Solid, 2, "SWING RES");
          addLine("swing_sup", m.swing_sup, "#22C55E", LineStyle.Solid, 2, "SWING SUP");
        }

        chartRef.current.timeScale().fitContent();
      }
    } else {
      // DAILY MODE
      vwapSeriesRef.current?.setData([]);

      if (dailyCandles.length > 0) {
        const dData = dailyCandles
          .map((c) => ({
            time: c.date as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
          .sort((a, b) => String(a.time).localeCompare(String(b.time)));

        series.setData(dData);

        // Daily PWH and PWL Series
        if (pwhSeriesRef.current) {
          const pwhData = dailyCandles
            .filter((c) => c.pwh && c.pwh > 0)
            .map((c) => ({ time: c.date as Time, value: c.pwh as number }))
            .sort((a, b) => String(a.time).localeCompare(String(b.time)));
          pwhSeriesRef.current.setData(pwhData);
        }

        if (pwlSeriesRef.current) {
          const pwlData = dailyCandles
            .filter((c) => c.pwl && c.pwl > 0)
            .map((c) => ({ time: c.date as Time, value: c.pwl as number }))
            .sort((a, b) => String(a.time).localeCompare(String(b.time)));
          pwlSeriesRef.current.setData(pwlData);
        }

        chartRef.current.timeScale().fitContent();
      }
    }
  }, [mode, dailyCandles, intradayCandles, macroLevels, symbol]);

  const { zones } = useChartMacroZones({
    chartRef,
    candleSeriesRef,
    macroLevels,
    enabled: mode === "INTRADAY",
  });

  return (
    <div className="w-full h-full relative select-none">
      <div ref={containerRef} className="w-full h-full min-h-[500px]" />

      {/* Shaded Macro Supply & Demand Zones */}
      {mode === "INTRADAY" &&
        zones.map((z) => (
          <div
            key={z.id}
            style={{ top: `${z.topPx}px`, height: `${z.heightPx}px` }}
            className={`absolute left-0 right-14 pointer-events-none z-10 flex items-center justify-end pr-2 transition-all ${
              z.type === "SUPPLY"
                ? "bg-rose-500/15 border-y border-rose-500/40"
                : "bg-emerald-500/15 border-y border-emerald-500/40"
            }`}
          >
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs select-none backdrop-blur-xs ${
                z.type === "SUPPLY"
                  ? "bg-surface/90 text-rose-300 border border-rose-500/40"
                  : "bg-surface/90 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {z.type === "SUPPLY" ? "🔴 " : "🟢 "}
              {z.label}
            </div>
          </div>
        ))}
    </div>
  );
};
