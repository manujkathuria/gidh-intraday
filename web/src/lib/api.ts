export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    // If running in browser on localhost (and not proxied through port 8080 directly)
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port === "8080") {
        return "";
      }
      return "http://127.0.0.1:8080";
    }
    // Remote host (domain or VM IP) served behind Nginx reverse proxy
    return "";
  }
  return "";
};



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
  vwap_upper_1?: number;
  vwap_lower_1?: number;
  vwap_upper_2?: number;
  vwap_lower_2?: number;
  rvol?: number;
}

export async function fetchSessions(): Promise<string[]> {
  try {
    const res = await fetch(`${getApiBase()}/v1/market/sessions`);
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
      `${getApiBase()}/v1/replay/snapshot?session_date=${sessionDate}&time=${timeStr}&_t=${Date.now()}`,
      { cache: "no-store" }
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
  toTimeStr: string,
  interval: string = "1m"
): Promise<Candle[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/v1/replay/candles?session_date=${sessionDate}&symbol=${symbol}&to_time=${toTimeStr}&interval=${interval}&_t=${Date.now()}`,
      { cache: "no-store" }
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
        vwap_upper_1: c.vwap_upper_1 ? Number(c.vwap_upper_1) : undefined,
        vwap_lower_1: c.vwap_lower_1 ? Number(c.vwap_lower_1) : undefined,
        vwap_upper_2: c.vwap_upper_2 ? Number(c.vwap_upper_2) : undefined,
        vwap_lower_2: c.vwap_lower_2 ? Number(c.vwap_lower_2) : undefined,
        rvol: c.rvol !== undefined && c.rvol !== null ? Number(c.rvol) : undefined,
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
  side: "LONG" | "SHORT" | "BUY" | "SELL" | string;
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
  side: "LONG" | "SHORT" | "BUY" | "SELL";
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
    const res = await fetch(`${getApiBase()}/v1/live/orders`);
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
    const res = await fetch(`${getApiBase()}/v1/live/orders`, {
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
    const res = await fetch(`${getApiBase()}/v1/live/orders/square-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, reason }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to square off position:", err);
    return false;
  }
}

export async function fetchQuantBrainRules(): Promise<any[]> {
  try {
    const res = await fetch(`${getApiBase()}/v1/quant/brain-rules`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch quant brain rules:", err);
    return [];
  }
}

export interface FuturesInflowItem {
  symbol: string;
  trading_symbol: string;
  session_date: string;
  fut_close: number;
  prev_close: number;
  fut_oi: number;
  prev_oi: number;
  total_notional_cr: number;
  price_1d_pct: number;
  oi_1d_pct: number;
  fresh_inflow_1d_cr: number;
  oi_3d_pct: number;
  fresh_inflow_3d_cr: number;
}

export interface FuturesInflowResponse {
  session_date: string;
  available_dates: string[];
  total_count: number;
  data: FuturesInflowItem[];
}

export async function fetchFuturesInflow(sessionDate?: string): Promise<FuturesInflowResponse | null> {
  try {
    const url = sessionDate 
      ? `${getApiBase()}/v1/market/macro/futures-inflow?date=${sessionDate}`
      : `${getApiBase()}/v1/market/macro/futures-inflow`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch futures macro data:", err);
    return null;
  }
}
