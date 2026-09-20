"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  currentLtp,
  entryPrice,
  stopLossPrice,
  targetPrice,
  limitPrice,
  isLimitDraggable = false,
  onLimitPriceChange,
  orderSide = "LONG",
  orderType = "MARKET",
  onChangeLevels,
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

  // Price Lines References
  const entryLineRef = useRef<any>(null);
  const stopLineRef = useRef<any>(null);
  const targetLineRef = useRef<any>(null);
  const limitLineRef = useRef<any>(null);

  const [dragY, setDragY] = useState<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

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
      candleSeriesRef.current = null;
      vwapSeriesRef.current = null;
      upper1SeriesRef.current = null;
      lower1SeriesRef.current = null;
      upper2SeriesRef.current = null;
      lower2SeriesRef.current = null;
    };
  }, []);

  // 2. React to Theme & Interval Changes
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !vwapSeriesRef.current || !upper1SeriesRef.current || !lower1SeriesRef.current || !upper2SeriesRef.current || !lower2SeriesRef.current) return;

    chartRef.current.applyOptions(getChartOptions(isDark, interval));
    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;

    candleSeriesRef.current.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUpColor,
      borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });

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

    // Sanitize candles to prevent Lightweight Charts crash from NaN/Infinity/null
    const candleData = (candles || [])
      .filter((c) =>
        c &&
        typeof c.time === "number" &&
        Number.isFinite(c.time) &&
        typeof c.open === "number" &&
        Number.isFinite(c.open) &&
        typeof c.high === "number" &&
        Number.isFinite(c.high) &&
        typeof c.low === "number" &&
        Number.isFinite(c.low) &&
        typeof c.close === "number" &&
        Number.isFinite(c.close)
      )
      .map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    candleSeriesRef.current.setData(candleData);

    // Only supply VWAP and Sigma bands data when intraday (1m, 5m, 15m)
    if (isIntraday) {
      const vwapData = (candles || [])
        .filter((c) => c && typeof c.time === "number" && Number.isFinite(c.time) && typeof c.vwap === "number" && Number.isFinite(c.vwap) && c.vwap > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap,
        }));
      vwapSeriesRef.current.setData(vwapData);

      const upper1Data = (candles || [])
        .filter((c) => c && typeof c.time === "number" && Number.isFinite(c.time) && typeof c.vwap_upper_1 === "number" && Number.isFinite(c.vwap_upper_1) && c.vwap_upper_1 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_upper_1!,
        }));
      upper1SeriesRef.current.setData(upper1Data);

      const lower1Data = (candles || [])
        .filter((c) => c && typeof c.time === "number" && Number.isFinite(c.time) && typeof c.vwap_lower_1 === "number" && Number.isFinite(c.vwap_lower_1) && c.vwap_lower_1 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_lower_1!,
        }));
      lower1SeriesRef.current.setData(lower1Data);

      const upper2Data = (candles || [])
        .filter((c) => c && typeof c.time === "number" && Number.isFinite(c.time) && typeof c.vwap_upper_2 === "number" && Number.isFinite(c.vwap_upper_2) && c.vwap_upper_2 > 0)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.vwap_upper_2!,
        }));
      upper2SeriesRef.current.setData(upper2Data);

      const lower2Data = (candles || [])
        .filter((c) => c && typeof c.time === "number" && Number.isFinite(c.time) && typeof c.vwap_lower_2 === "number" && Number.isFinite(c.vwap_lower_2) && c.vwap_lower_2 > 0)
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
          ts.fitContent();
        } else {
          ts.setVisibleLogicalRange({
            from: candleData.length - 60,
            to: candleData.length + 3,
          });
        }
      }
    }
  }, [candles, symbol, interval, selectedDate, isIntraday]);

  // 4. Render and update Entry, Stop Loss, and Target Price Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Entry Line
    if (entryPrice && entryPrice > 0) {
      if (!entryLineRef.current) {
        entryLineRef.current = series.createPriceLine({
          price: entryPrice,
          color: "#3B82F6",
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "ENTRY",
        });
      } else {
        entryLineRef.current.applyOptions({ price: entryPrice });
      }
    } else if (entryLineRef.current) {
      series.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }

    // Stop Loss Line
    if (stopLossPrice && stopLossPrice > 0) {
      if (!stopLineRef.current) {
        stopLineRef.current = series.createPriceLine({
          price: stopLossPrice,
          color: "#EF4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "STOP",
        });
      } else {
        stopLineRef.current.applyOptions({ price: stopLossPrice });
      }
    } else if (stopLineRef.current) {
      series.removePriceLine(stopLineRef.current);
      stopLineRef.current = null;
    }

    // Target Line
    if (targetPrice && targetPrice > 0) {
      if (!targetLineRef.current) {
        targetLineRef.current = series.createPriceLine({
          price: targetPrice,
          color: "#10B981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TARGET",
        });
      } else {
        targetLineRef.current.applyOptions({ price: targetPrice });
      }
    } else if (targetLineRef.current) {
      series.removePriceLine(targetLineRef.current);
      targetLineRef.current = null;
    }
  }, [entryPrice, stopLossPrice, targetPrice]);

  // 5. Render Limit Order Price Line (Dashed Orange/Cyan)
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    if (limitPrice && limitPrice > 0 && orderType === "LIMIT") {
      const lineColor = orderSide === "LONG" ? "#10B981" : "#EF4444";
      if (!limitLineRef.current) {
        limitLineRef.current = series.createPriceLine({
          price: limitPrice,
          color: lineColor,
          lineWidth: 2,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `LIMIT ${orderSide}`,
        });
      } else {
        limitLineRef.current.applyOptions({
          price: limitPrice,
          color: lineColor,
          title: `LIMIT ${orderSide}`,
        });
      }
    } else if (limitLineRef.current) {
      series.removePriceLine(limitLineRef.current);
      limitLineRef.current = null;
    }
  }, [limitPrice, orderType, orderSide]);

  // 6. Interactive Drag Handle for Limit Price Line
  const updateYCoordinate = useCallback(() => {
    if (!candleSeriesRef.current || !limitPrice || limitPrice <= 0 || orderType !== "LIMIT") {
      setDragY(null);
      return;
    }
    const y = candleSeriesRef.current.priceToCoordinate(limitPrice);
    if (y !== null && !isNaN(y)) {
      setDragY(y);
    }
  }, [limitPrice, orderType]);

  useEffect(() => {
    updateYCoordinate();
  }, [limitPrice, orderType, candles, updateYCoordinate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLimitDraggable || orderType !== "LIMIT") return;
    isDraggingRef.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !chartContainerRef.current || !candleSeriesRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const clientY = e.clientY - rect.top;

      const price = candleSeriesRef.current.coordinateToPrice(clientY);
      if (price !== null && !isNaN(price) && price > 0) {
        let roundedPrice = Math.round(price / 0.05) * 0.05;

        // Basic check: Long limit cannot go above LTP; Short limit cannot go below LTP
        const ltp = currentLtp || (candles.length > 0 ? candles[candles.length - 1].close : 0);
        if (ltp > 0) {
          if (orderSide === "LONG") {
            roundedPrice = Math.min(roundedPrice, ltp);
          } else if (orderSide === "SHORT") {
            roundedPrice = Math.max(roundedPrice, ltp);
          }
        }

        if (onLimitPriceChange) {
          onLimitPriceChange(parseFloat(roundedPrice.toFixed(2)));
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isLimitDraggable, onLimitPriceChange, currentLtp, orderSide, candles]);

  return (
    <div className="w-full h-full relative select-none">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Interactive Draggable Slider Bar on Limit Price */}
      {isLimitDraggable && orderType === "LIMIT" && dragY !== null && dragY >= 0 && (
        <div
          onMouseDown={handleMouseDown}
          style={{ top: `${dragY - 10}px` }}
          className="absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group"
          title="Drag up/down to adjust limit entry price"
        >
          <div className="w-full h-[2px] bg-foreground/40 group-hover:bg-foreground transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px]  font-black text-foreground shadow-md shrink-0 flex items-center gap-1 group-hover:border-foreground/60 transition">
            <span>⇅ DRAG LIMIT: ₹{limitPrice?.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
