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
  hasActivePosition = false,
  positionSide = "LONG",
  editingLevelType = null,
  draftLevelPrice = 0,
  onDraftLevelPriceChange,
  onUpdateLevels,
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
  const pdhLineRef = useRef<any>(null);
  const pdlLineRef = useRef<any>(null);

  // Drag coordinates state
  const [dragLimitY, setDragLimitY] = useState<number | null>(null);
  const [dragLevelY, setDragLevelY] = useState<number | null>(null);

  // Active dragging ref: null | "LIMIT" | "LEVEL"
  const activeDragRef = useRef<"LIMIT" | "LEVEL" | null>(null);

  const isDark = theme === "dark";
  const isIntraday = interval === "1m" || interval === "5m" || interval === "15m";

  // Effective displayed levels (draft price when actively editing, else position price)
  const displayStopPrice = editingLevelType === "SL" && draftLevelPrice > 0 ? draftLevelPrice : stopLossPrice;
  const displayTargetPrice = editingLevelType === "TP" && draftLevelPrice > 0 ? draftLevelPrice : targetPrice;

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
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const upper1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const lower1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const upper2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const lower2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    vwapSeriesRef.current = vwapSeries;
    upper1SeriesRef.current = upper1Series;
    lower1SeriesRef.current = lower1Series;
    upper2SeriesRef.current = upper2Series;
    lower2SeriesRef.current = lower2Series;

    const handleResize = () => {
      if (container && chart) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      vwapSeriesRef.current = null;
      upper1SeriesRef.current = null;
      lower1SeriesRef.current = null;
      upper2SeriesRef.current = null;
      lower2SeriesRef.current = null;
      entryLineRef.current = null;
      stopLineRef.current = null;
      targetLineRef.current = null;
      limitLineRef.current = null;
      pdhLineRef.current = null;
      pdlLineRef.current = null;
    };
  }, []);

  // 2. Update Options on Theme / Interval Change
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    chartRef.current.applyOptions(getChartOptions(isDark, interval, width, height));

    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;
    candleSeriesRef.current?.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.borderUpColor,
      borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor,
      wickDownColor: colors.wickDownColor,
    });
    vwapSeriesRef.current?.applyOptions({ color: colors.vwapColor });
    upper1SeriesRef.current?.applyOptions({ color: colors.sigma1Color });
    lower1SeriesRef.current?.applyOptions({ color: colors.sigma1Color });
    upper2SeriesRef.current?.applyOptions({ color: colors.sigma2Color });
    lower2SeriesRef.current?.applyOptions({ color: colors.sigma2Color });
  }, [isDark, interval]);

  // 3. Populate and Update Candle & Technical Indicator Data
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
      const currentKey = `${symbol}_${interval}_${selectedDate}`;
      if (lastKeyRef.current !== currentKey) {
        lastKeyRef.current = currentKey;
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
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

  // 4. Render Entry, Stop Loss, and Target Price Lines
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

    // Stop Loss Line (Hide static canvas line when actively dragging/editing SL)
    if (displayStopPrice && displayStopPrice > 0 && editingLevelType !== "SL") {
      if (!stopLineRef.current) {
        stopLineRef.current = series.createPriceLine({
          price: displayStopPrice,
          color: "#EF4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "STOP",
        });
      } else {
        stopLineRef.current.applyOptions({
          price: displayStopPrice,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: "STOP",
        });
      }
    } else if (stopLineRef.current) {
      series.removePriceLine(stopLineRef.current);
      stopLineRef.current = null;
    }

    // Target Line (Hide static canvas line when actively dragging/editing TP)
    if (displayTargetPrice && displayTargetPrice > 0 && editingLevelType !== "TP") {
      if (!targetLineRef.current) {
        targetLineRef.current = series.createPriceLine({
          price: displayTargetPrice,
          color: "#10B981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TARGET",
        });
      } else {
        targetLineRef.current.applyOptions({
          price: displayTargetPrice,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: "TARGET",
        });
      }
    } else if (targetLineRef.current) {
      series.removePriceLine(targetLineRef.current);
      targetLineRef.current = null;
    }
  }, [entryPrice, displayStopPrice, displayTargetPrice, editingLevelType]);

  // 5. Render Limit Order Price Line
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

  // 6. Render Previous Day High (PDH) & Previous Day Low (PDL) Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    if (!isIntraday || !candles || candles.length === 0) {
      if (pdhLineRef.current) {
        series.removePriceLine(pdhLineRef.current);
        pdhLineRef.current = null;
      }
      if (pdlLineRef.current) {
        series.removePriceLine(pdlLineRef.current);
        pdlLineRef.current = null;
      }
      return;
    }

    // Extract PDH and PDL from candle data
    const latestCandle = candles[candles.length - 1];
    const pdh = latestCandle?.pdh ?? candles.find((c) => (c?.pdh ?? 0) > 0)?.pdh;
    const pdl = latestCandle?.pdl ?? candles.find((c) => (c?.pdl ?? 0) > 0)?.pdl;

    const levelColor = isDark ? "#E2E8F0" : "#334155";

    // Previous Day High (PDH)
    if (pdh && pdh > 0) {
      if (!pdhLineRef.current) {
        pdhLineRef.current = series.createPriceLine({
          price: pdh,
          color: levelColor,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: "PDH",
        });
      } else {
        pdhLineRef.current.applyOptions({
          price: pdh,
          color: levelColor,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          title: "PDH",
        });
      }
    } else if (pdhLineRef.current) {
      series.removePriceLine(pdhLineRef.current);
      pdhLineRef.current = null;
    }

    // Previous Day Low (PDL) - Matching PDH Color
    if (pdl && pdl > 0) {
      if (!pdlLineRef.current) {
        pdlLineRef.current = series.createPriceLine({
          price: pdl,
          color: levelColor,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: "PDL",
        });
      } else {
        pdlLineRef.current.applyOptions({
          price: pdl,
          color: levelColor,
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          title: "PDL",
        });
      }
    } else if (pdlLineRef.current) {
      series.removePriceLine(pdlLineRef.current);
      pdlLineRef.current = null;
    }
  }, [candles, isIntraday, isDark]);

  // 7. Update Drag Handles Coordinates
  const updateCoordinates = useCallback(() => {
    if (!candleSeriesRef.current) {
      setDragLimitY(null);
      setDragLevelY(null);
      return;
    }

    // Limit Drag Y (only when Limit Order modal is active)
    if (limitPrice && limitPrice > 0 && orderType === "LIMIT" && isLimitDraggable) {
      const y = candleSeriesRef.current.priceToCoordinate(limitPrice);
      setDragLimitY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragLimitY(null);
    }

    // SL / TP Level Drag Y (ONLY when actively editing SL or TP!)
    if (editingLevelType && draftLevelPrice > 0) {
      const y = candleSeriesRef.current.priceToCoordinate(draftLevelPrice);
      setDragLevelY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragLevelY(null);
    }
  }, [limitPrice, orderType, isLimitDraggable, editingLevelType, draftLevelPrice]);

  useEffect(() => {
    updateCoordinates();
  }, [candles, updateCoordinates]);

  // Drag Mouse Down Handlers
  const handleLimitMouseDown = (e: React.MouseEvent) => {
    if (!isLimitDraggable || orderType !== "LIMIT") return;
    activeDragRef.current = "LIMIT";
    e.preventDefault();
  };

  const handleLevelMouseDown = (e: React.MouseEvent) => {
    if (!editingLevelType) return;
    activeDragRef.current = "LEVEL";
    e.preventDefault();
  };

  // Drag Movement Handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDragRef.current || !chartContainerRef.current || !candleSeriesRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const clientY = e.clientY - rect.top;

      const price = candleSeriesRef.current.coordinateToPrice(clientY);
      if (price === null || isNaN(price) || price <= 0) return;

      const roundedPrice = parseFloat((Math.round(price / 0.05) * 0.05).toFixed(2));
      const ltp = currentLtp || (candles.length > 0 ? candles[candles.length - 1].close : 0);

      if (activeDragRef.current === "LIMIT") {
        let finalPrice = roundedPrice;
        if (ltp > 0) {
          if (orderSide === "LONG") finalPrice = Math.min(roundedPrice, ltp);
          else if (orderSide === "SHORT") finalPrice = Math.max(roundedPrice, ltp);
        }
        if (onLimitPriceChange) onLimitPriceChange(finalPrice);
      } else if (activeDragRef.current === "LEVEL") {
        if (onDraftLevelPriceChange) {
          onDraftLevelPriceChange(roundedPrice);
        }
      }
    };

    const handleMouseUp = () => {
      activeDragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isLimitDraggable,
    onLimitPriceChange,
    currentLtp,
    orderSide,
    candles,
    editingLevelType,
    onDraftLevelPriceChange,
  ]);

  return (
    <div className="w-full h-full relative select-none" data-chart-interactive="true">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* 1. Interactive Limit Drag Handle (Only when Limit Order Modal is Open) */}
      {isLimitDraggable && orderType === "LIMIT" && dragLimitY !== null && dragLimitY >= 0 && (
        <div
          onMouseDown={handleLimitMouseDown}
          style={{ top: `${dragLimitY - 10}px` }}
          className="chart-drag-handle absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group"
          title="Drag up/down to adjust limit entry price"
          data-chart-interactive="true"
        >
          <div className="w-full h-[2px] bg-foreground/40 group-hover:bg-foreground transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] font-black text-foreground shadow-md shrink-0 flex items-center gap-1 group-hover:border-foreground/60 transition">
            <span>⇅ DRAG LIMIT: ₹{limitPrice?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* 2. Interactive SL / TP Drag Handle (ONLY visible when you click SL or TP in header!) */}
      {editingLevelType && draftLevelPrice > 0 && dragLevelY !== null && dragLevelY >= 0 && (
        <div
          onMouseDown={handleLevelMouseDown}
          style={{ top: `${dragLevelY - 10}px` }}
          className="chart-drag-handle absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group animate-in fade-in duration-150"
          title={`Drag up/down to adjust ${editingLevelType === "SL" ? "Stop Loss" : "Target Price"}`}
          data-chart-interactive="true"
        >
          <div
            className={`w-full h-[2px] transition ${
              editingLevelType === "SL" ? "bg-rose-500/80 group-hover:bg-rose-500" : "bg-emerald-500/80 group-hover:bg-emerald-500"
            }`}
          />
          <div
            className={`px-2 py-0.5 rounded bg-surface border text-[10px] font-black shadow-lg shrink-0 flex items-center gap-1 transition ${
              editingLevelType === "SL"
                ? "border-rose-500 text-rose-500 group-hover:bg-rose-500/10"
                : "border-emerald-500 text-emerald-500 group-hover:bg-emerald-500/10"
            }`}
          >
            <span>
              ⇅ DRAG {editingLevelType}: ₹{draftLevelPrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
