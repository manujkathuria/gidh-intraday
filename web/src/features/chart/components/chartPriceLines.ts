import { ISeriesApi, LineStyle } from "lightweight-charts";
import { Candle } from "@/lib/api";

export function syncPriceLines(
  series: ISeriesApi<"Candlestick"> | null,
  linesRef: {
    entryLineRef: React.MutableRefObject<any>;
    stopLineRef: React.MutableRefObject<any>;
    targetLineRef: React.MutableRefObject<any>;
    limitLineRef: React.MutableRefObject<any>;
    pdhLineRef: React.MutableRefObject<any>;
    pdlLineRef: React.MutableRefObject<any>;
  },
  params: {
    entryPrice?: number;
    displayStopPrice?: number;
    displayTargetPrice?: number;
    editingLevelType: "SL" | "TP" | null;
    limitPrice?: number;
    orderType: "MARKET" | "LIMIT";
    orderSide: "LONG" | "SHORT";
    candles?: Candle[];
    isIntraday: boolean;
    isDark: boolean;
  }
) {
  if (!series) return;

  // Entry Line
  if (params.entryPrice && params.entryPrice > 0) {
    if (!linesRef.entryLineRef.current) {
      linesRef.entryLineRef.current = series.createPriceLine({
        price: params.entryPrice, color: "#3B82F6", lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: "ENTRY",
      });
    } else {
      linesRef.entryLineRef.current.applyOptions({ price: params.entryPrice });
    }
  } else if (linesRef.entryLineRef.current) {
    series.removePriceLine(linesRef.entryLineRef.current);
    linesRef.entryLineRef.current = null;
  }

  // Stop Loss Line
  if (params.displayStopPrice && params.displayStopPrice > 0 && params.editingLevelType !== "SL") {
    if (!linesRef.stopLineRef.current) {
      linesRef.stopLineRef.current = series.createPriceLine({
        price: params.displayStopPrice, color: "#EF4444", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "STOP",
      });
    } else {
      linesRef.stopLineRef.current.applyOptions({ price: params.displayStopPrice, lineWidth: 1, lineStyle: LineStyle.Dashed, title: "STOP" });
    }
  } else if (linesRef.stopLineRef.current) {
    series.removePriceLine(linesRef.stopLineRef.current);
    linesRef.stopLineRef.current = null;
  }

  // Target Line
  if (params.displayTargetPrice && params.displayTargetPrice > 0 && params.editingLevelType !== "TP") {
    if (!linesRef.targetLineRef.current) {
      linesRef.targetLineRef.current = series.createPriceLine({
        price: params.displayTargetPrice, color: "#10B981", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "TARGET",
      });
    } else {
      linesRef.targetLineRef.current.applyOptions({ price: params.displayTargetPrice, lineWidth: 1, lineStyle: LineStyle.Dashed, title: "TARGET" });
    }
  } else if (linesRef.targetLineRef.current) {
    series.removePriceLine(linesRef.targetLineRef.current);
    linesRef.targetLineRef.current = null;
  }

  // Limit Order Line
  if (params.limitPrice && params.limitPrice > 0 && params.orderType === "LIMIT") {
    const lineColor = params.orderSide === "LONG" ? "#10B981" : "#EF4444";
    if (!linesRef.limitLineRef.current) {
      linesRef.limitLineRef.current = series.createPriceLine({
        price: params.limitPrice, color: lineColor, lineWidth: 2, lineStyle: LineStyle.LargeDashed, axisLabelVisible: true, title: `LIMIT ${params.orderSide}`,
      });
    } else {
      linesRef.limitLineRef.current.applyOptions({ price: params.limitPrice, color: lineColor, title: `LIMIT ${params.orderSide}` });
    }
  } else if (linesRef.limitLineRef.current) {
    series.removePriceLine(linesRef.limitLineRef.current);
    linesRef.limitLineRef.current = null;
  }

  // PDH / PDL Lines
  syncPdhPdlLines(series, linesRef, params);
}






function syncPdhPdlLines(
  series: ISeriesApi<"Candlestick">,
  linesRef: { pdhLineRef: React.MutableRefObject<any>; pdlLineRef: React.MutableRefObject<any> },
  params: { candles?: Candle[]; isIntraday: boolean; isDark: boolean }
) {
  if (!params.isIntraday || !params.candles || params.candles.length === 0) {
    if (linesRef.pdhLineRef.current) {
      series.removePriceLine(linesRef.pdhLineRef.current);
      linesRef.pdhLineRef.current = null;
    }
    if (linesRef.pdlLineRef.current) {
      series.removePriceLine(linesRef.pdlLineRef.current);
      linesRef.pdlLineRef.current = null;
    }
    return;
  }

  const latestCandle = params.candles[params.candles.length - 1];
  const pdh = latestCandle?.pdh ?? params.candles.find((c) => (c?.pdh ?? 0) > 0)?.pdh;
  const pdl = latestCandle?.pdl ?? params.candles.find((c) => (c?.pdl ?? 0) > 0)?.pdl;
  const levelColor = params.isDark ? "#E2E8F0" : "#334155";

  if (pdh && pdh > 0) {
    if (!linesRef.pdhLineRef.current) {
      linesRef.pdhLineRef.current = series.createPriceLine({
        price: pdh, color: levelColor, lineWidth: 1, lineStyle: LineStyle.LargeDashed, axisLabelVisible: true, title: "PDH",
      });
    } else {
      linesRef.pdhLineRef.current.applyOptions({ price: pdh, color: levelColor, lineWidth: 1, lineStyle: LineStyle.LargeDashed, title: "PDH" });
    }
  } else if (linesRef.pdhLineRef.current) {
    series.removePriceLine(linesRef.pdhLineRef.current);
    linesRef.pdhLineRef.current = null;
  }

  if (pdl && pdl > 0) {
    if (!linesRef.pdlLineRef.current) {
      linesRef.pdlLineRef.current = series.createPriceLine({
        price: pdl, color: levelColor, lineWidth: 1, lineStyle: LineStyle.LargeDashed, axisLabelVisible: true, title: "PDL",
      });
    } else {
      linesRef.pdlLineRef.current.applyOptions({ price: pdl, color: levelColor, lineWidth: 1, lineStyle: LineStyle.LargeDashed, title: "PDL" });
    }
  } else if (linesRef.pdlLineRef.current) {
    series.removePriceLine(linesRef.pdlLineRef.current);
    linesRef.pdlLineRef.current = null;
  }
}

