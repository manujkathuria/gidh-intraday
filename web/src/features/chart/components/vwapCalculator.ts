import { Candle } from "@/lib/api";

export interface EnrichedCandle extends Candle {
  vwap_upper_1?: number;
  vwap_lower_1?: number;
  vwap_upper_2?: number;
  vwap_lower_2?: number;
  developing_poc?: number;
}

/**
 * Calculates cumulative VWAP standard deviation bands (±1σ, ±2σ)
 * and the Dynamic Developing Point of Control (POC) step curve.
 */
export function computeVwapBands(candles: Candle[]): EnrichedCandle[] {
  let cumVol = 0;
  let cumPV = 0;
  let cumP2V = 0;

  // Price bin frequency map for developing POC
  const priceVolumeBins = new Map<number, number>();
  let currentPocPrice = 0;
  let currentMaxVol = 0;

  return candles.map((c) => {
    const vol = c.volume && c.volume > 0 ? c.volume : 1;
    const typicalPrice = (c.high + c.low + c.close) / 3;

    cumVol += vol;
    cumPV += typicalPrice * vol;
    cumP2V += typicalPrice * typicalPrice * vol;

    const vwap = c.vwap && c.vwap > 0 ? c.vwap : cumPV / cumVol;

    // Distribute bar volume across High, Low, and Close for precise tick binning
    // This guarantees that 1m, 5m, and 15m aggregated bars resolve to the exact same POC
    const bins = [
      Math.round(c.high * 2) / 2,
      Math.round(c.low * 2) / 2,
      Math.round(typicalPrice * 2) / 2,
      Math.round(c.close * 2) / 2,
    ];
    const volPerBin = vol / bins.length;

    for (const b of bins) {
      const newBinVol = (priceVolumeBins.get(b) || 0) + volPerBin;
      priceVolumeBins.set(b, newBinVol);

      if (newBinVol > currentMaxVol) {
        currentMaxVol = newBinVol;
        currentPocPrice = b;
      }
    }

    const meanP2 = cumP2V / cumVol;
    const variance = Math.max(0, meanP2 - (cumPV / cumVol) * (cumPV / cumVol));
    const sigma = Math.sqrt(variance);

    return {
      ...c,
      vwap,
      vwap_upper_1: c.vwap_upper_1 && c.vwap_upper_1 > 0 ? c.vwap_upper_1 : vwap + sigma,
      vwap_lower_1: c.vwap_lower_1 && c.vwap_lower_1 > 0 ? c.vwap_lower_1 : vwap - sigma,
      vwap_upper_2: c.vwap_upper_2 && c.vwap_upper_2 > 0 ? c.vwap_upper_2 : vwap + 2 * sigma,
      vwap_lower_2: c.vwap_lower_2 && c.vwap_lower_2 > 0 ? c.vwap_lower_2 : vwap - 2 * sigma,
      developing_poc: c.developing_poc && c.developing_poc > 0 ? c.developing_poc : (currentPocPrice > 0 ? currentPocPrice : typicalPrice),
    };
  });
}


