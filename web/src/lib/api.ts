import { auth } from "./firebase";

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port === "8080") {
        return "";
      }
      return "http://127.0.0.1:8080";
    }
    return "";
  }
  return "";
};

export const getStreamWsUrl = (path: string): string => {
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${proto}//127.0.0.1:8080${path}`;
    }
    return `${proto}//${window.location.host}${path}`;
  }
  return `ws://127.0.0.1:8080${path}`;
};

export const getStreamWsUrlWithAuth = async (path: string): Promise<string> => {
  const baseUrl = getStreamWsUrl(path);
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}auth=${encodeURIComponent(token)}`;
    }
  } catch (e) {
    // fallback
  }
  return baseUrl;
};

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    // fallback
  }
  return {};
}

// Data Interfaces
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
  pdh?: number;
  pdl?: number;
}

export interface MarketStatus {
  isLive: boolean;
  liveDate?: string;
  lastTickAgeMs?: number;
}

// 1. Market Status
export async function fetchMarketStatus(): Promise<MarketStatus> {
  try {
    const res = await fetch(`${getApiBase()}/api/market/status`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore
  }
  return { isLive: false };
}

// 2. Available Sessions
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

// 3. Market Snapshot
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

export async function fetchReplaySnapshot(sessionDate: string, timeStr: string): Promise<ReplaySnapshot | null> {
  return fetchMarketSnapshot(sessionDate);
}

// 4. Candles with VWAP + ±1σ, ±2σ Bands + RVOL + PDH/PDL
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
  toTimeStr: string,
  interval: string = "1m"
): Promise<Candle[]> {
  return fetchMultiIntervalCandles(symbol, sessionDate, interval);
}

// Trading Position & Order Types
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
  stop_loss_price?: number;
  target_price?: number;
  tactic?: string;
  invalidation?: string;
  broker_order_id?: string;
  opened_at: string;
  updated_at: string;
}

export interface ClosedPosition {
  id: string;
  symbol: string;
  instrument_token: number;
  exchange: string;
  side: "LONG" | "SHORT" | string;
  quantity: number;
  entry_price: number;
  exit_price: number;
  pnl_inr: number;
  pnl_pct: number;
  opened_at: string;
  closed_at: string;
  exit_reason: string;
  broker_order_id?: string;
}

export interface OrderIntent {
  client_order_id?: string;
  symbol: string;
  side: "LONG" | "SHORT";
  order_type: "MARKET" | "LIMIT";
  target_entry_price?: number;
  margin_inr?: number;
  tactic?: string;
  invalidation?: string;
}

export interface ManagedOrder {
  id: string;
  client_order_id: string;
  broker_order_id?: string;
  order_type: "MARKET" | "SYNTHETIC_LIMIT";
  status: "PENDING" | "TRIGGERING" | "SUBMITTING" | "SUBMITTED" | "FILLED" | "REJECTED" | "CANCELLED" | "RECONCILE_REQUIRED" | "EXIT_SUBMITTED" | "CLOSED";
  symbol: string;
  instrument_token: number;
  exchange: string;
  side: "LONG" | "SHORT";
  quantity: number;
  margin_inr: number;
  limit_price?: number;
  expected_stop_price?: number;
  expected_target_price?: number;
  actual_fill_price?: number;
  stop_price?: number;
  target_price?: number;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// 5. Positions & Orders
export async function fetchLivePositions(): Promise<ActivePosition[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/positions`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchLivePositions error:", err);
  }
  return [];
}

export async function fetchClosedPositions(date?: string): Promise<ClosedPosition[]> {
  try {
    const url = date ? `${getApiBase()}/api/trading/closed-positions?date=${encodeURIComponent(date)}` : `${getApiBase()}/api/trading/closed-positions`;
    const res = await fetch(url, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchClosedPositions error:", err);
  }
  return [];
}

export async function fetchManagedOrders(): Promise<ManagedOrder[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/orders`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchManagedOrders error:", err);
  }
  return [];
}

export async function createLiveOrder(intent: OrderIntent): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        client_order_id: intent.client_order_id ?? crypto.randomUUID(),
        symbol: intent.symbol,
        side: intent.side,
        order_type: intent.order_type,
        target_entry_price: intent.target_entry_price,
        margin_inr: intent.margin_inr ?? 10000,
        tactic: intent.tactic,
        invalidation: intent.invalidation ?? "15M_VWAP_CROSS",
      }),
    });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || "Order creation failed");
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to create live order:", err);
    throw err;
  }
}

export async function squareOffLivePosition(
  symbol: string,
  reason = "MANUAL_SQUARE_OFF"
): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/positions/${encodeURIComponent(symbol)}/square-off`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to square off position:", err);
  }
  return null;
}

export async function updateLivePositionLevels(
  symbol: string,
  stopLossPrice?: number | null,
  targetPrice?: number | null
): Promise<ActivePosition | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/positions/${encodeURIComponent(symbol)}/levels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        stop_loss_price: stopLossPrice !== undefined && stopLossPrice !== null ? stopLossPrice : null,
        target_price: targetPrice !== undefined && targetPrice !== null ? targetPrice : null,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || "Update levels failed");
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to update position levels:", err);
    throw err;
  }
}

export async function cancelLimitOrder(id: string): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/orders/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to cancel order:", err);
  }
  return null;
}

export interface RiskState {
  kill_switch: boolean;
  circuit_broken: boolean;
  reason?: string;
}

export async function fetchRiskState(): Promise<RiskState> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/risk-state`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchRiskState error:", err);
  }
  return { kill_switch: false, circuit_broken: false };
}

export async function resetTripwire(): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/risk-state/reset`, {
      method: "POST",
      headers: authHeaders,
    });
    return res.ok;
  } catch (err) {
    console.error("[REST] resetTripwire error:", err);
    return false;
  }
}

export async function fetchQuantBrainRules(): Promise<any[]> {
  return [];
}

export interface FuturesInflowItem {
  symbol: string;
  tradingSymbol?: string;
  trading_symbol?: string;
  sessionDate?: string;
  session_date?: string;
  futClose?: number;
  fut_close: number;
  prevClose?: number;
  prev_close: number;
  futOi?: string | number;
  fut_oi?: string | number;
  prevOi?: string | number;
  prev_oi?: string | number;
  totalNotionalCr?: number;
  total_notional_cr?: number;
  price1dPct?: number;
  price_1d_pct?: number;
  oi1dPct?: number;
  oi_1d_pct?: number;
  freshInflow1dCr?: number;
  fresh_inflow_1d_cr?: number;
  oi3dPct?: number;
  oi_3d_pct?: number;
  freshInflow3dCr?: number;
  fresh_inflow_3d_cr?: number;
}

export interface FuturesInflowResponse {
  session_date: string;
  available_dates: string[];
  total_count: number;
  data: FuturesInflowItem[];
}

export interface FuturesInflowFilterParams {
  date?: string;
  minPrice?: number;
  maxPrice?: number;
  minInflow?: number;
  minOiPct?: number;
}

export async function fetchFuturesInflow(
  params?: string | FuturesInflowFilterParams
): Promise<FuturesInflowResponse | null> {
  return null;
}

export async function fetchQuantOperatingSchedule(): Promise<any[]> {
  return [
    { time: "08:45 AM", title: "Pre-Market Warmup", desc: "Token auth & 210 universe discovery" },
    { time: "09:15 AM", title: "Open Observation", desc: "Chill Guy Rule: Zero entries in first 15m" },
    { time: "09:30 AM", title: "Bar 1 Close (Entries)", desc: "Screen RVOL ≥ 5x Volume Leaders" },
    { time: "09:45 AM", title: "Bar 2 Close (Traps)", desc: "Catch false breakout traps & fill 5 slots" },
    { time: "11:30 AM", title: "Scout Split-Exit", desc: "Cut stagnant Tier 3 & BE ratchet (+1.5%)" },
    { time: "14:30 PM", title: "Scout Power Hour", desc: "Trail winning runner stops into close" },
    { time: "15:15 PM", title: "MIS Square-Off", desc: "Unconditional intraday exit before 15:20" },
  ];
}

export interface BrainSessionRecordRaw {
  sessionDate: string;
  brainId: string;
  aiThesis: string;
  decisionsJson: string;
  sensoryFeaturesJson?: string;
  outcomesJson?: string;
  forensics?: string;
  createdAt: string;
}

export interface BrainMemoryRecordRaw {
  brainId: string;
  memoryStateJson: string;
  updatedAt: string;
}

export async function fetchBrainSession(date?: string, brainId?: string): Promise<BrainSessionRecordRaw | null> {
  const sessions = await fetchBrainSessions(brainId, 1);
  return sessions.length > 0 ? sessions[0] : null;
}

export async function fetchBrainSessions(brainId?: string, limit?: number): Promise<BrainSessionRecordRaw[]> {
  try {
    const q = new URLSearchParams();
    if (brainId) q.append("brainId", brainId);
    if (limit) q.append("limit", limit.toString());
    const res = await fetch(`${getApiBase()}/api/macro/brain-sessions?${q.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const records = await res.json();
      return (records || []).map((r: any) => ({
        sessionDate: r.session_date,
        brainId: r.brain_id,
        aiThesis: r.ai_thesis,
        decisionsJson: r.decisions_json,
        sensoryFeaturesJson: r.sensory_features_json,
        outcomesJson: r.outcomes_json,
        forensics: r.forensics,
        createdAt: r.created_at,
      }));
    }
  } catch (err) {
    console.error("fetchBrainSessions error:", err);
  }
  return [];
}

export async function fetchBrainMemory(brainId: string): Promise<BrainMemoryRecordRaw | null> {
  return null;
}

export async function fetchBrainAvailableDates(): Promise<string[]> {
  return [];
}
