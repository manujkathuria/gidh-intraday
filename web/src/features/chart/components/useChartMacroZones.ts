import { useEffect, useState, useCallback, useRef } from "react";
import { IChartApi, ISeriesApi } from "lightweight-charts";
import { MacroLevelsData } from "@/lib/api_quant";

export interface MacroRenderZone {
  id: string;
  type: "SUPPLY" | "DEMAND";
  topPx: number;
  heightPx: number;
  topPrice: number;
  bottomPrice: number;
  date: string;
  label: string;
}

export function useChartMacroZones({
  chartRef,
  candleSeriesRef,
  macroLevels,
  enabled = true,
  candles,
}: {
  chartRef: React.MutableRefObject<IChartApi | null>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  macroLevels?: MacroLevelsData | null;
  enabled?: boolean;
  candles?: any[];
}) {
  const [zones, setZones] = useState<MacroRenderZone[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const calculateCoordinates = useCallback(() => {
    if (!enabled || !macroLevels || !candleSeriesRef.current) {
      setZones([]);
      return;
    }

    const series = candleSeriesRef.current;
    const computedZones: MacroRenderZone[] = [];

    // 1. Supply Zones
    if (macroLevels.clv_supply_zones && macroLevels.clv_supply_zones.length > 0) {
      macroLevels.clv_supply_zones.forEach((sz, idx) => {
        const yTop = series.priceToCoordinate(sz.top);
        const yBot = series.priceToCoordinate(sz.bottom);
        if (yTop !== null && yBot !== null && !isNaN(yTop) && !isNaN(yBot)) {
          const topPx = Math.min(yTop, yBot);
          const heightPx = Math.max(3, Math.abs(yBot - yTop));
          computedZones.push({
            id: `sz_${idx}_${sz.date}`,
            type: "SUPPLY",
            topPx,
            heightPx,
            topPrice: sz.top,
            bottomPrice: sz.bottom,
            date: sz.date,
            label: `Supply Zone ${idx + 1}`,
          });
        }
      });
    }

    // 2. Demand Zones
    if (macroLevels.clv_demand_zones && macroLevels.clv_demand_zones.length > 0) {
      macroLevels.clv_demand_zones.forEach((dz, idx) => {
        const yTop = series.priceToCoordinate(dz.top);
        const yBot = series.priceToCoordinate(dz.bottom);
        if (yTop !== null && yBot !== null && !isNaN(yTop) && !isNaN(yBot)) {
          const topPx = Math.min(yTop, yBot);
          const heightPx = Math.max(3, Math.abs(yBot - yTop));
          computedZones.push({
            id: `dz_${idx}_${dz.date}`,
            type: "DEMAND",
            topPx,
            heightPx,
            topPrice: dz.top,
            bottomPrice: dz.bottom,
            date: dz.date,
            label: `Demand Zone ${idx + 1}`,
          });
        }
      });
    }

    setZones(computedZones);
  }, [enabled, macroLevels, candleSeriesRef]);

  const scheduleUpdate = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(() => {
      calculateCoordinates();
    });
  }, [calculateCoordinates]);

  useEffect(() => {
    scheduleUpdate();
  }, [candles, macroLevels, enabled, scheduleUpdate]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    calculateCoordinates();

    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(scheduleUpdate);
    timeScale.subscribeVisibleTimeRangeChange(scheduleUpdate);

    // Also recalculate when crosshair / price scale moves
    chart.subscribeCrosshairMove(scheduleUpdate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(scheduleUpdate);
        timeScale.unsubscribeVisibleTimeRangeChange(scheduleUpdate);
        chart.unsubscribeCrosshairMove(scheduleUpdate);
      } catch {
        // cleanup safe
      }
    };
  }, [chartRef, scheduleUpdate, calculateCoordinates]);

  return { zones, updateMacroZones: calculateCoordinates };
}
