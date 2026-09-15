import { Candle } from "@/lib/api";

export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "1d";

export function aggregateCandles(candles: Candle[], interval: ChartInterval): Candle[] {
  if (interval === "1m" || interval === "1h" || interval === "1d" || candles.length === 0) {
    return candles;
  }

  const bucketSeconds = interval === "5m" ? 300 : 900; // 5 min or 15 min
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
  let high = -Infinity;
  let low = Infinity;
  let totalVol = 0;
  let lastClose = bars[bars.length - 1].close;
  let lastVwap = bars[bars.length - 1].vwap;

  for (const b of bars) {
    if (b.high > high) high = b.high;
    if (b.low < low) low = b.low;
    totalVol += b.volume;
  }

  return {
    time,
    open,
    high,
    low,
    close: lastClose,
    volume: totalVol,
    vwap: lastVwap,
  };
}
