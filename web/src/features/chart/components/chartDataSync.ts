import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { Candle } from "@/lib/api";
import { computeVwapBands } from "./vwapCalculator";

export interface IndicatorVisibility {
  showVwap?: boolean;
  showBands?: boolean;
  showPoc?: boolean;
}

export function syncCandlesAndIndicators(
  candles: Candle[] | undefined,
  isIntraday: boolean,
  seriesMap: {
    candleSeries: ISeriesApi<"Candlestick"> | null;
    vwapSeries: ISeriesApi<"Line"> | null;
    upper1Series: ISeriesApi<"Line"> | null;
    lower1Series: ISeriesApi<"Line"> | null;
    upper2Series: ISeriesApi<"Line"> | null;
    lower2Series: ISeriesApi<"Line"> | null;
    pocSeries?: ISeriesApi<"Line"> | null;
  },
  visibility?: IndicatorVisibility
) {
  const { candleSeries, vwapSeries, upper1Series, lower1Series, upper2Series, lower2Series, pocSeries } = seriesMap;
  if (!candleSeries || !vwapSeries || !upper1Series || !lower1Series || !upper2Series || !lower2Series) return [];

  const showVwap = visibility?.showVwap !== false;
  const showBands = visibility?.showBands !== false;
  const showPoc = visibility?.showPoc !== false;

  const rawCandles = candles || [];
  const candleData = rawCandles
    .filter((c) =>
      c &&
      typeof c.time === "number" && Number.isFinite(c.time) &&
      typeof c.open === "number" && Number.isFinite(c.open) &&
      typeof c.high === "number" && Number.isFinite(c.high) &&
      typeof c.low === "number" && Number.isFinite(c.low) &&
      typeof c.close === "number" && Number.isFinite(c.close)
    )
    .map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

  candleSeries.setData(candleData);

  if (isIntraday && rawCandles.length > 0) {
    const enriched = computeVwapBands(rawCandles);
    
    if (showVwap) {
      vwapSeries.setData(enriched.filter((c) => (c.vwap || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.vwap })));
    } else {
      vwapSeries.setData([]);
    }

    if (showBands) {
      upper1Series.setData(enriched.filter((c) => (c.vwap_upper_1 || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.vwap_upper_1! })));
      lower1Series.setData(enriched.filter((c) => (c.vwap_lower_1 || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.vwap_lower_1! })));
      upper2Series.setData(enriched.filter((c) => (c.vwap_upper_2 || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.vwap_upper_2! })));
      lower2Series.setData(enriched.filter((c) => (c.vwap_lower_2 || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.vwap_lower_2! })));
    } else {
      upper1Series.setData([]);
      lower1Series.setData([]);
      upper2Series.setData([]);
      lower2Series.setData([]);
    }
    
    if (pocSeries) {
      if (showPoc) {
        pocSeries.setData(enriched.filter((c) => (c.developing_poc || 0) > 0).map((c) => ({ time: c.time as UTCTimestamp, value: c.developing_poc! })));
      } else {
        pocSeries.setData([]);
      }
    }
  } else {
    vwapSeries.setData([]);
    upper1Series.setData([]);
    lower1Series.setData([]);
    upper2Series.setData([]);
    lower2Series.setData([]);
    if (pocSeries) pocSeries.setData([]);
  }

  return candleData;
}

