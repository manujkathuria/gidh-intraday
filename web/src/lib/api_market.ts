import { getApiBase } from "./api_client";
import { Candle, MarketStatus, ReplaySnapshot } from "./types_market";

export async function fetchMarketStatus(): Promise<MarketStatus> {
  try {
    const res = await fetch(`${getApiBase()}/api/market/status`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return { isLive: false };
}

export async function fetchSessions(): Promise<string[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/market/sessions`, { cache: "no-store" });
    if (res.ok) {
      const list = await res.json();
      return (list || []).map((s: any) => s.date).filter(Boolean);
    }
  } catch (err) {
    console.warn("[REST] fetchSessions error:", err);
  }
  return [];
}

export async function fetchMarketSnapshot(date?: string): Promise<ReplaySnapshot | null> {
  try {
    const url = date ? `${getApiBase()}/api/market/snapshot?date=${encodeURIComponent(date)}` : `${getApiBase()}/api/market/snapshot`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchMarketSnapshot error:", err);
  }
  return null;
}

export async function fetchReplaySnapshot(sessionDate: string, _timeStr: string): Promise<ReplaySnapshot | null> {
  return fetchMarketSnapshot(sessionDate);
}

export async function fetchMultiIntervalCandles(
  symbol: string,
  date: string,
  interval: string = "1m"
): Promise<Candle[]> {
  try {
    const url = `${getApiBase()}/api/market/candles?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}&interval=${encodeURIComponent(interval)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[REST] fetchCandles for ${symbol} error:`, err);
  }
  return [];
}

export async function fetchReplayCandles(
  sessionDate: string,
  symbol: string,
  _toTimeStr: string,
  interval: string = "1m"
): Promise<Candle[]> {
  return fetchMultiIntervalCandles(symbol, sessionDate, interval);
}

export interface HVNNode {
  price_level: number;
  volume: number;
  volume_pct: number;
  is_top_defense: boolean;
}

export interface HVNResponse {
  symbol: string;
  session_date: string;
  total_volume: number;
  hvns: HVNNode[];
}

export async function fetchChartHVNs(symbol: string, date?: string): Promise<HVNResponse | null> {
  try {
    const url = date
      ? `${getApiBase()}/api/market/chart/hvn?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`
      : `${getApiBase()}/api/market/chart/hvn?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchChartHVNs error:", err);
  }
  return null;
}

