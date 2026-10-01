import { ISeriesApi, LineStyle } from "lightweight-charts";
import { Candle } from "@/lib/api";
import { MacroLevelsData } from "@/lib/api_quant";

export function syncPriceLines(
  series: ISeriesApi<"Candlestick"> | null,
  linesRef: {
    entryLineRef: React.MutableRefObject<any>;
    stopLineRef: React.MutableRefObject<any>;
    targetLineRef: React.MutableRefObject<any>;
    limitLineRef: React.MutableRefObject<any>;
    pdhLineRef: React.MutableRefObject<any>;
    pdlLineRef: React.MutableRefObject<any>;
    pwhLineRef?: React.MutableRefObject<any>;
    pwlLineRef?: React.MutableRefObject<any>;
    swingResLineRef?: React.MutableRefObject<any>;
    swingSupLineRef?: React.MutableRefObject<any>;
    supplyZone1TopRef?: React.MutableRefObject<any>;
    supplyZone1BaseRef?: React.MutableRefObject<any>;
    supplyZone2TopRef?: React.MutableRefObject<any>;
    supplyZone2BaseRef?: React.MutableRefObject<any>;
    demandZone1TopRef?: React.MutableRefObject<any>;
    demandZone1FloorRef?: React.MutableRefObject<any>;
    demandZone2TopRef?: React.MutableRefObject<any>;
    demandZone2FloorRef?: React.MutableRefObject<any>;
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
    macroLevels?: MacroLevelsData | null;
    showMacroLevels?: boolean;
    showPwhPwl?: boolean;
    showPdhPdl?: boolean;
    showSwingPivots?: boolean;
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

  // Macro Levels (PWH, PWL, PDH, PDL, Swing RES/SUP)
  syncMacroPriceLines(series, linesRef, params);
}

function syncMacroPriceLines(
  series: ISeriesApi<"Candlestick">,
  linesRef: any,
  params: {
    candles?: Candle[];
    macroLevels?: MacroLevelsData | null;
    showMacroLevels?: boolean;
    showPwhPwl?: boolean;
    showPdhPdl?: boolean;
    showSwingPivots?: boolean;
    isIntraday: boolean;
    isDark: boolean;
  }
) {
  const showMacro = params.showMacroLevels !== false;
  const showPwh = params.showPwhPwl !== false;
  const showPdh = params.showPdhPdl !== false;
  const showSwing = params.showSwingPivots !== false;
  const m = params.macroLevels;

  // Helper to sync or remove a single line
  const syncLine = (
    refKey: string,
    price: number | null | undefined,
    color: string,
    lineWidth: number,
    lineStyle: LineStyle,
    title: string,
    condition: boolean = true
  ) => {
    if (!linesRef[refKey]) return;
    if (showMacro && condition && price && price > 0) {
      if (!linesRef[refKey].current) {
        linesRef[refKey].current = series.createPriceLine({
          price,
          color,
          lineWidth: lineWidth as any,
          lineStyle,
          axisLabelVisible: true,
          title,
        });
      } else {
        linesRef[refKey].current.applyOptions({
          price,
          color,
          lineWidth: lineWidth as any,
          lineStyle,
          title,
        });
      }
    } else if (linesRef[refKey].current) {
      series.removePriceLine(linesRef[refKey].current);
      linesRef[refKey].current = null;
    }
  };

  // 1. PDH & PDL
  const candlePdh = params.candles && params.candles.length > 0 ? (params.candles[params.candles.length - 1]?.pdh ?? params.candles.find((c) => (c?.pdh ?? 0) > 0)?.pdh) : null;
  const candlePdl = params.candles && params.candles.length > 0 ? (params.candles[params.candles.length - 1]?.pdl ?? params.candles.find((c) => (c?.pdl ?? 0) > 0)?.pdl) : null;
  const pdh = m?.pdh ?? candlePdh;
  const pdl = m?.pdl ?? candlePdl;

  syncLine("pdhLineRef", pdh, "#FB923C", 1, LineStyle.Dotted, "PDH", showPdh);
  syncLine("pdlLineRef", pdl, "#38BDF8", 1, LineStyle.Dotted, "PDL", showPdh);

  // 2. PWH & PWL (Prior Week High & Low)
  syncLine("pwhLineRef", m?.pwh, "#EF4444", 2, LineStyle.Dashed, "PWH", showPwh);
  syncLine("pwlLineRef", m?.pwl, "#22C55E", 2, LineStyle.Dashed, "PWL", showPwh);

  // 3. Swing RES & SUP (Clean solid lines without title tags)
  syncLine("swingResLineRef", m?.swing_res, "#EF4444", 2, LineStyle.Solid, "", showSwing);
  syncLine("swingSupLineRef", m?.swing_sup, "#22C55E", 2, LineStyle.Solid, "", showSwing);
}

