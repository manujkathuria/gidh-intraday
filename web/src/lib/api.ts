const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export interface SessionInfo {
  date?: string;
  session_date?: string;
  feature_run_id?: string;
  instruments?: number;
}

export interface ReplayStock {
  symbol: string;
  sector: string;
  price: number;
  gap_pct: number;
  move_pct: number;
  vwap: number;
  vwap_dist_pct: number;
  rvol: number;
  clv: number;
  volume: number;
  is_above_vwap: boolean;
}

export interface ReplaySector {
  sector: string;
  civ_count: number;
  avg_move_pct: number;
  avg_rvol: number;
  pct_above_vwap: number;
}

export interface ReplayTrap {
  symbol: string;
  sector: string;
  trap_type: string;
  confidence: string;
  description: string;
  move_pct: number;
  gap_pct: number;
  rvol: number;
  clv: number;
}

export interface ReplayWeather {
  total_civs: number;
  above_vwap: number;
  below_vwap: number;
  pct_above_vwap: number;
}

export interface ReplaySnapshot {
  session_date: string;
  as_of_time: string;
  weather: ReplayWeather;
  stocks: ReplayStock[];
  sectors: ReplaySector[];
  traps: ReplayTrap[];
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export async function fetchSessions(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/market/sessions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: SessionInfo[] = await res.json();
    const dates = data
      .map((d) => d.date || d.session_date)
      .filter((d): d is string => Boolean(d));
    return Array.from(new Set(dates));
  } catch (err) {
    console.error("Failed to fetch sessions:", err);
    return [];
  }
}

export async function fetchReplaySnapshot(
  sessionDate: string,
  timeStr: string
): Promise<ReplaySnapshot | null> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/replay/snapshot?session_date=${sessionDate}&time=${timeStr}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch replay snapshot:", err);
    return null;
  }
}

export async function fetchReplayCandles(
  sessionDate: string,
  symbol: string,
  toTimeStr: string
): Promise<Candle[]> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/replay/candles?session_date=${sessionDate}&symbol=${symbol}&to_time=${toTimeStr}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    const items: Candle[] = [];
    const seen = new Set<number>();

    for (const c of raw) {
      let t: number;
      if (typeof c.time === "number" && !isNaN(c.time)) {
        t = c.time;
      } else if (c.ts) {
        t = Math.floor(new Date(c.ts).getTime() / 1000);
      } else {
        continue;
      }

      if (isNaN(t) || seen.has(t)) continue;
      seen.add(t);

      items.push({
        time: t,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
        vwap: Number(c.vwap || c.close),
      });
    }

    return items.sort((a, b) => a.time - b.time);
  } catch (err) {
    console.error(`Failed to fetch candles for ${symbol}:`, err);
    return [];
  }
}

export interface ActivePosition {
  symbol: string;
  instrument_token: number;
  exchange: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  current_ltp: number;
  pnl_inr: number;
  pnl_pct: number;
  mfe_pct: number;
  stop_floor_pct: number;
  tactic?: string;
  invalidation?: string;
  broker_order_id?: string;
  opened_at: string;
  updated_at: string;
}

export interface OrderIntent {
  symbol: string;
  side: "LONG" | "SHORT";
  margin_inr?: number;
  tactic?: string;
  invalidation?: string;
}

export interface LivePositionsResponse {
  active_positions: ActivePosition[];
  total_count: number;
}

export async function fetchLivePositions(): Promise<ActivePosition[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/live/orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: LivePositionsResponse = await res.json();
    return data.active_positions || [];
  } catch (err) {
    console.error("Failed to fetch live positions:", err);
    return [];
  }
}

export async function createLiveOrder(intent: OrderIntent): Promise<ActivePosition | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/live/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error("Failed to create live order:", err);
    throw err;
  }
}

export async function squareOffLivePosition(
  symbol: string,
  reason = "MANUAL_SQUARE_OFF"
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/live/orders/square-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, reason }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to square off ${symbol}:`, err);
    return false;
  }
}

