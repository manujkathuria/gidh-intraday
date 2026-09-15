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
