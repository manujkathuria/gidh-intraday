import { Candle } from "@/lib/api";

export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "1d";

export function aggregateCandles(candles: Candle[], interval: ChartInterval): Candle[] {
  if (interval === "1m" || candles.length === 0) {
    return candles;
  }

  const bucketSecondsByInterval: Record<Exclude<ChartInterval, "1m">, number> = {
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "1d": 86400,
  };
  const bucketSeconds = bucketSecondsByInterval[interval];
  const aggregated: Candle[] = [];
  let currentBucket: Candle[] = [];
  let currentBucketTime = Math.floor(candles[0].time / bucketSeconds) * bucketSeconds;

  for (const c of candles) {
    const bucket = Math.floor(c.time / bucketSeconds) * bucketSeconds;
    if (bucket !== currentBucketTime && currentBucket.length > 0) {
      aggregated.push(buildAggregatedBar(currentBucket, currentBucketTime));
      currentBucket = [];
      currentBucketTime = bucket;
    }
    currentBucket.push(c);
  }

  if (currentBucket.length > 0) {
    aggregated.push(buildAggregatedBar(currentBucket, currentBucketTime));
  }

  return aggregated;
}

function buildAggregatedBar(bars: Candle[], time: number): Candle {
  const open = bars[0].open;
  let high = bars[0].high;
  let low = bars[0].low;
  let totalVol = 0;
  const lastBar = bars[bars.length - 1];
  const lastClose = lastBar.close;
  const lastVwap = lastBar.vwap;

  for (const b of bars) {
    if (typeof b.high === "number" && Number.isFinite(b.high) && b.high > high) high = b.high;
    if (typeof b.low === "number" && Number.isFinite(b.low) && b.low < low) low = b.low;
    if (typeof b.volume === "number" && Number.isFinite(b.volume)) totalVol += b.volume;
  }

  return {
    time,
    open,
    high,
    low,
    close: lastClose,
    volume: totalVol,
    vwap: lastVwap,
    vwap_upper_1: lastBar.vwap_upper_1,
    vwap_lower_1: lastBar.vwap_lower_1,
    vwap_upper_2: lastBar.vwap_upper_2,
    vwap_lower_2: lastBar.vwap_lower_2,
    rvol: lastBar.rvol,
    developing_poc: lastBar.developing_poc,
    pdh: bars[0].pdh,
    pdl: bars[0].pdl,
  };
}

/**
 * Merges historical HTF candles (1h / 1d) with today's real-time live intraday candles.
 * Updates or appends the latest live candle for today.
 */
export function mergeLiveCandleIntoHTF(
  historical: Candle[],
  liveIntraday: Candle[],
  interval: "1h" | "1d"
): Candle[] {
  if (historical.length === 0) {
    return aggregateCandles(liveIntraday, interval);
  }
  if (liveIntraday.length === 0) {
    return historical;
  }

  const liveHTF = aggregateCandles(liveIntraday, interval);
  if (liveHTF.length === 0) {
    return historical;
  }

  const merged = [...historical];
  for (const liveBar of liveHTF) {
    const existingIndex = merged.findIndex((h) => h.time === liveBar.time);
    if (existingIndex >= 0) {
      merged[existingIndex] = liveBar;
    } else {
      merged.push(liveBar);
    }
  }

  return merged.sort((a, b) => a.time - b.time);
}
