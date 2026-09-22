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

  // Drag coordinates state
  const [dragLimitY, setDragLimitY] = useState<number | null>(null);
  const [dragStopY, setDragStopY] = useState<number | null>(null);
  const [dragTargetY, setDragTargetY] = useState<number | null>(null);

  // Active dragging ref: null | "LIMIT" | "STOP" | "TARGET"
  const activeDragRef = useRef<"LIMIT" | "STOP" | "TARGET" | null>(null);

  // Local dragged price states during active drag
  const [tempStopPrice, setTempStopPrice] = useState<number | undefined>(stopLossPrice);
  const [tempTargetPrice, setTempTargetPrice] = useState<number | undefined>(targetPrice);

  const isDark = theme === "dark";
  const isIntraday = interval === "1m" || interval === "5m" || interval === "15m";

  // Sync temp prices when props change (if not actively dragging)
  useEffect(() => {
    if (activeDragRef.current !== "STOP") {
      setTempStopPrice(stopLossPrice);
    }
  }, [stopLossPrice]);

  useEffect(() => {
    if (activeDragRef.current !== "TARGET") {
      setTempTargetPrice(targetPrice);
    }
  }, [targetPrice]);

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
      lastValueVisible: false,
      title: "VWAP",
    });

    const upper1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "+1σ",
    });

    const lower1Series = chart.addSeries(LineSeries, {
      color: colors.sigma1Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "-1σ",
    });

    const upper2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "+2σ",
    });

    const lower2Series = chart.addSeries(LineSeries, {
      color: colors.sigma2Color,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "-2σ",
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

  // 4. Render and update Entry, Stop Loss, and Target Price Lines
  const activeStop = tempStopPrice ?? stopLossPrice;
  const activeTarget = tempTargetPrice ?? targetPrice;

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
    if (activeStop && activeStop > 0) {
      if (!stopLineRef.current) {
        stopLineRef.current = series.createPriceLine({
          price: activeStop,
          color: "#EF4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "STOP",
        });
      } else {
        stopLineRef.current.applyOptions({ price: activeStop });
      }
    } else if (stopLineRef.current) {
      series.removePriceLine(stopLineRef.current);
      stopLineRef.current = null;
    }

    // Target Line
    if (activeTarget && activeTarget > 0) {
      if (!targetLineRef.current) {
        targetLineRef.current = series.createPriceLine({
          price: activeTarget,
          color: "#10B981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TARGET",
        });
      } else {
        targetLineRef.current.applyOptions({ price: activeTarget });
      }
    } else if (targetLineRef.current) {
      series.removePriceLine(targetLineRef.current);
      targetLineRef.current = null;
    }
  }, [entryPrice, activeStop, activeTarget]);

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

  // 6. Update Drag Handles Coordinates
  const updateCoordinates = useCallback(() => {
    if (!candleSeriesRef.current) {
      setDragLimitY(null);
      setDragStopY(null);
      setDragTargetY(null);
      return;
    }

    // Limit Y
    if (limitPrice && limitPrice > 0 && orderType === "LIMIT") {
      const y = candleSeriesRef.current.priceToCoordinate(limitPrice);
      setDragLimitY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragLimitY(null);
    }

    // Stop Loss Y
    if (hasActivePosition && activeStop && activeStop > 0) {
      const y = candleSeriesRef.current.priceToCoordinate(activeStop);
      setDragStopY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragStopY(null);
    }

    // Target Y
    if (hasActivePosition && activeTarget && activeTarget > 0) {
      const y = candleSeriesRef.current.priceToCoordinate(activeTarget);
      setDragTargetY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragTargetY(null);
    }
  }, [limitPrice, orderType, hasActivePosition, activeStop, activeTarget]);

  useEffect(() => {
    updateCoordinates();
  }, [candles, updateCoordinates]);

  // Drag Event Handlers
  const handleLimitMouseDown = (e: React.MouseEvent) => {
    if (!isLimitDraggable || orderType !== "LIMIT") return;
    activeDragRef.current = "LIMIT";
    e.preventDefault();
  };

  const handleStopMouseDown = (e: React.MouseEvent) => {
    if (!hasActivePosition || !activeStop) return;
    activeDragRef.current = "STOP";
    e.preventDefault();
  };

  const handleTargetMouseDown = (e: React.MouseEvent) => {
    if (!hasActivePosition || !activeTarget) return;
    activeDragRef.current = "TARGET";
    e.preventDefault();
  };

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
      } else if (activeDragRef.current === "STOP") {
        setTempStopPrice(roundedPrice);
      } else if (activeDragRef.current === "TARGET") {
        setTempTargetPrice(roundedPrice);
      }
    };

    const handleMouseUp = () => {
      if (!activeDragRef.current) return;

      if (activeDragRef.current === "STOP" && tempStopPrice && onUpdateLevels) {
        onUpdateLevels(symbol, tempStopPrice, undefined);
      } else if (activeDragRef.current === "TARGET" && tempTargetPrice && onUpdateLevels) {
        onUpdateLevels(symbol, undefined, tempTargetPrice);
      }

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
    symbol,
    tempStopPrice,
    tempTargetPrice,
    onUpdateLevels,
  ]);

  return (
    <div className="w-full h-full relative select-none">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* 1. Interactive Limit Drag Handle */}
      {isLimitDraggable && orderType === "LIMIT" && dragLimitY !== null && dragLimitY >= 0 && (
        <div
          onMouseDown={handleLimitMouseDown}
          style={{ top: `${dragLimitY - 10}px` }}
          className="absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group"
          title="Drag up/down to adjust limit entry price"
        >
          <div className="w-full h-[2px] bg-foreground/40 group-hover:bg-foreground transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] font-black text-foreground shadow-md shrink-0 flex items-center gap-1 group-hover:border-foreground/60 transition">
            <span>⇅ DRAG LIMIT: ₹{limitPrice?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* 2. Interactive Stop Loss Drag Handle */}
      {hasActivePosition && activeStop && activeStop > 0 && dragStopY !== null && dragStopY >= 0 && (
        <div
          onMouseDown={handleStopMouseDown}
          style={{ top: `${dragStopY - 10}px` }}
          className="absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group"
          title="Drag up/down to adjust Stop Loss"
        >
          <div className="w-full h-[2px] bg-rose-500/40 group-hover:bg-rose-500 transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-rose-500/40 text-[10px] font-black text-rose-500 shadow-md shrink-0 flex items-center gap-1 group-hover:border-rose-500 transition">
            <span>⇅ DRAG SL: ₹{activeStop?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* 3. Interactive Target Price Drag Handle */}
      {hasActivePosition && activeTarget && activeTarget > 0 && dragTargetY !== null && dragTargetY >= 0 && (
        <div
          onMouseDown={handleTargetMouseDown}
          style={{ top: `${dragTargetY - 10}px` }}
          className="absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group"
          title="Drag up/down to adjust Target Price"
        >
          <div className="w-full h-[2px] bg-emerald-500/40 group-hover:bg-emerald-500 transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-emerald-500/40 text-[10px] font-black text-emerald-500 shadow-md shrink-0 flex items-center gap-1 group-hover:border-emerald-500 transition">
            <span>⇅ DRAG TP: ₹{activeTarget?.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
