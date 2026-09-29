"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, LineStyle } from "lightweight-charts";
import { ChartProps } from "../types";
import { getChartOptions, CANDLE_COLORS } from "./chartOptions";
import { syncPriceLines } from "./chartPriceLines";
import { syncCandlesAndIndicators } from "./chartDataSync";
import { useChartDraggableLines } from "./useChartDraggableLines";
import { useChartIndicatorStore } from "@/stores/chartIndicatorStore";

export const CandlestickCanvas: React.FC<ChartProps> = (props) => {
  const {
    candles, symbol, theme = "dark", interval = "1m", selectedDate = "",
    currentLtp, entryPrice, stopLossPrice, targetPrice, limitPrice,
    isLimitDraggable = false, onLimitPriceChange, orderSide = "LONG", orderType = "MARKET",
    editingLevelType = null, draftLevelPrice = 0, onDraftLevelPriceChange,
  } = props;
  const { showVwap, showBands, showPoc } = useChartIndicatorStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const upper1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lower1SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const upper2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lower2SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const pocSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastKeyRef = useRef<string>("");

  const entryLineRef = useRef<any>(null);
  const stopLineRef = useRef<any>(null);
  const targetLineRef = useRef<any>(null);
  const limitLineRef = useRef<any>(null);
  const pdhLineRef = useRef<any>(null);
  const pdlLineRef = useRef<any>(null);

  const isDark = theme === "dark";
  const isIntraday = interval === "1m" || interval === "5m" || interval === "15m";
  const displayStopPrice = editingLevelType === "SL" && draftLevelPrice > 0 ? draftLevelPrice : stopLossPrice;
  const displayTargetPrice = editingLevelType === "TP" && draftLevelPrice > 0 ? draftLevelPrice : targetPrice;


  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;
    const chart = createChart(container, getChartOptions(isDark, interval, container.clientWidth || 800, container.clientHeight || 400));
    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor, downColor: colors.downColor, borderVisible: true,
      borderUpColor: colors.borderUpColor, borderDownColor: colors.borderDownColor,
      wickUpColor: colors.wickUpColor, wickDownColor: colors.wickDownColor,
    });
    vwapSeriesRef.current = chart.addSeries(LineSeries, { color: colors.vwapColor, lineWidth: 2, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: true });
    upper1SeriesRef.current = chart.addSeries(LineSeries, { color: colors.sigma1Color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: true });
    lower1SeriesRef.current = chart.addSeries(LineSeries, { color: colors.sigma1Color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: true });
    upper2SeriesRef.current = chart.addSeries(LineSeries, { color: colors.sigma2Color, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: true });
    lower2SeriesRef.current = chart.addSeries(LineSeries, { color: colors.sigma2Color, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: true });
    pocSeriesRef.current = chart.addSeries(LineSeries, { color: colors.pocColor, lineWidth: 2, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: true });
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
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    chartRef.current.applyOptions(getChartOptions(isDark, interval, chartContainerRef.current.clientWidth || 800, chartContainerRef.current.clientHeight || 400));
    const colors = isDark ? CANDLE_COLORS.dark : CANDLE_COLORS.light;
    candleSeriesRef.current?.applyOptions({ upColor: colors.upColor, downColor: colors.downColor, borderUpColor: colors.borderUpColor, borderDownColor: colors.borderDownColor, wickUpColor: colors.wickUpColor, wickDownColor: colors.wickDownColor });
    vwapSeriesRef.current?.applyOptions({ color: colors.vwapColor });
    upper1SeriesRef.current?.applyOptions({ color: colors.sigma1Color });
    lower1SeriesRef.current?.applyOptions({ color: colors.sigma1Color });
    upper2SeriesRef.current?.applyOptions({ color: colors.sigma2Color });
    lower2SeriesRef.current?.applyOptions({ color: colors.sigma2Color });
    pocSeriesRef.current?.applyOptions({ color: colors.pocColor });
  }, [isDark, interval]);


  useEffect(() => {
    const candleData = syncCandlesAndIndicators(
      candles,
      isIntraday,
      {
        candleSeries: candleSeriesRef.current,
        vwapSeries: vwapSeriesRef.current,
        upper1Series: upper1SeriesRef.current,
        lower1Series: lower1SeriesRef.current,
        upper2Series: upper2SeriesRef.current,
        lower2Series: lower2SeriesRef.current,
        pocSeries: pocSeriesRef.current,
      },
      { showVwap, showBands, showPoc }
    );

    if (candleData.length > 0 && chartRef.current) {
      const currentKey = `${symbol}_${interval}_${selectedDate}`;
      if (lastKeyRef.current !== currentKey) {
        lastKeyRef.current = currentKey;
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        const ts = chartRef.current.timeScale();
        ts.resetTimeScale();
        if (candleData.length <= 40) ts.fitContent();
        else ts.setVisibleLogicalRange({ from: candleData.length - 60, to: candleData.length + 3 });
      }
    }
  }, [candles, symbol, interval, selectedDate, isIntraday, showVwap, showBands, showPoc]);

  useEffect(() => {
    syncPriceLines(candleSeriesRef.current, { entryLineRef, stopLineRef, targetLineRef, limitLineRef, pdhLineRef, pdlLineRef }, {
      entryPrice, displayStopPrice, displayTargetPrice, editingLevelType, limitPrice, orderType, orderSide, candles, isIntraday, isDark,
    });
  }, [entryPrice, displayStopPrice, displayTargetPrice, editingLevelType, limitPrice, orderType, orderSide, candles, isIntraday, isDark]);



  const { dragLimitY, dragLevelY, handleLimitMouseDown, handleLevelMouseDown } = useChartDraggableLines({
    candleSeriesRef, chartContainerRef, limitPrice, orderType, orderSide, isLimitDraggable, onLimitPriceChange,
    editingLevelType, draftLevelPrice, onDraftLevelPriceChange, currentLtp, candles,
  });

  return (
    <div className="w-full h-full relative select-none" data-chart-interactive="true">
      <div ref={chartContainerRef} className="w-full h-full" />
      {isLimitDraggable && orderType === "LIMIT" && dragLimitY !== null && dragLimitY >= 0 && (
        <div onMouseDown={handleLimitMouseDown} style={{ top: `${dragLimitY - 10}px` }} className="chart-drag-handle absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group" title="Drag up/down to adjust limit entry price" data-chart-interactive="true">
          <div className="w-full h-[2px] bg-foreground/40 group-hover:bg-foreground transition" />
          <div className="px-2 py-0.5 rounded bg-surface border border-surface-border text-[10px] font-black text-foreground shadow-md shrink-0 flex items-center gap-1 group-hover:border-foreground/60 transition">
            <span>⇅ DRAG LIMIT: ₹{limitPrice?.toFixed(2)}</span>
          </div>
        </div>
      )}
      {editingLevelType && draftLevelPrice > 0 && dragLevelY !== null && dragLevelY >= 0 && (
        <div onMouseDown={handleLevelMouseDown} style={{ top: `${dragLevelY - 10}px` }} className="chart-drag-handle absolute left-0 right-14 h-5 z-20 flex items-center cursor-ns-resize group animate-in fade-in duration-150" title={`Drag up/down to adjust ${editingLevelType === "SL" ? "Stop Loss" : "Target Price"}`} data-chart-interactive="true">
          <div className={`w-full h-[2px] transition ${editingLevelType === "SL" ? "bg-rose-500/80 group-hover:bg-rose-500" : "bg-emerald-500/80 group-hover:bg-emerald-500"}`} />
          <div className={`px-2 py-0.5 rounded bg-surface border text-[10px] font-black shadow-lg shrink-0 flex items-center gap-1 transition ${editingLevelType === "SL" ? "border-rose-500 text-rose-500 group-hover:bg-rose-500/10" : "border-emerald-500 text-emerald-500 group-hover:bg-emerald-500/10"}`}>
            <span>⇅ DRAG {editingLevelType}: ₹{draftLevelPrice.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
