import { executeGraphQL } from "./graphql";

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

export interface MarketStatus {
  isLive: boolean;
  liveDate?: string;
  lastTickAgeMs?: number;
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
  try {
    const data = await executeGraphQL<{ marketStatus: MarketStatus }>(`
      query GetMarketStatus {
        marketStatus {
          isLive
          liveDate
          lastTickAgeMs
        }
      }
    `);
    if (data && data.marketStatus) {
      return data.marketStatus;
    }
  } catch (err) {
    // ignore
  }
  return { isLive: false };
}

export async function fetchSessions(): Promise<string[]> {
  try {
    const data = await executeGraphQL<{ sessions: { date: string }[] }>(`
      query GetSessions {
        sessions {
          date
        }
      }
    `);
    if (data && data.sessions) {
      return data.sessions.map((s) => s.date).filter(Boolean);
    }
  } catch (err) {
    console.warn("[GraphQL] fetchSessions error:", err);
  }
  return [];
}

export async function fetchMarketSnapshot(
  date?: string
): Promise<ReplaySnapshot | null> {
  try {
    const data = await executeGraphQL<{ marketSnapshot: ReplaySnapshot }>(`
      query GetMarketSnapshot($date: String) {
        marketSnapshot(date: $date) {
          session_date: sessionDate
          as_of_time: asOfTime
          weather {
            total_civs: totalCivs
            above_vwap: aboveVwap
            below_vwap: belowVwap
            pct_above_vwap: pctAboveVwap
          }
          stocks {
            symbol
            sector
            price
            gap_pct: gapPct
            move_pct: movePct
            vwap
            vwap_dist_pct: vwapDistPct
            rvol
            clv
            volume
            is_above_vwap: isAboveVwap
          }
          sectors {
            sector
            civ_count: civCount
            avg_move_pct: avgMovePct
            avg_rvol: avgRvol
            pct_above_vwap: pctAboveVwap
          }
          traps {
            symbol
            sector
            trap_type: trapType
            confidence
            description
            move_pct: movePct
            gap_pct: gapPct
            rvol
            clv
          }
        }
      }
    `, { date: date || null });
    if (data && data.marketSnapshot) {
      return data.marketSnapshot;
    }
  } catch (err) {
    console.warn("[GraphQL] fetchMarketSnapshot error:", err);
  }
  return null;
}

export async function fetchReplaySnapshot(
  sessionDate: string,
  timeStr: string
): Promise<ReplaySnapshot | null> {
  return fetchMarketSnapshot(sessionDate);
}

export async function fetchMultiIntervalCandles(
  symbol: string,
  date: string,
  interval: string = "1m"
): Promise<Candle[]> {
  try {
    const data = await executeGraphQL<{ candles: Candle[] }>(`
      query GetCandles($symbol: String!, $date: String!, $interval: String) {
        candles(symbol: $symbol, date: $date, interval: $interval) {
          time
          open
          high
          low
          close
          volume
          vwap
          vwap_upper_1: vwapUpper1
          vwap_lower_1: vwapLower1
          vwap_upper_2: vwapUpper2
          vwap_lower_2: vwapLower2
          rvol
        }
      }
    `, { symbol, date, interval });
    if (data && data.candles) {
      return data.candles;
    }
  } catch (err) {
    console.warn(`[GraphQL] fetchCandles for ${symbol} error:`, err);
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
    const data = await executeGraphQL<{ livePositions: any[] }>(`
      query GetLivePositions {
        livePositions {
          symbol
          instrumentToken
          exchange
          side
          quantity
          entryPrice
          currentLtp
          pnlInr
          pnlPct
          mfePct
          stopFloorPct
          tactic
          invalidation
          brokerOrderId
          openedAt
          updatedAt
        }
      }
    `);
    if (data && data.livePositions) {
      return data.livePositions.map((p) => ({
        symbol: p.symbol,
        instrument_token: p.instrumentToken,
        exchange: p.exchange,
        side: p.side,
        quantity: p.quantity,
        entry_price: p.entryPrice,
        current_ltp: p.currentLtp,
        pnl_inr: p.pnlInr,
        pnl_pct: p.pnlPct,
        mfe_pct: p.mfePct,
        stop_floor_pct: p.stopFloorPct,
        tactic: p.tactic,
        invalidation: p.invalidation,
        broker_order_id: p.brokerOrderId,
        opened_at: p.openedAt,
        updated_at: p.updatedAt,
      }));
    }
  } catch (err) {
    console.warn("[GraphQL] fetchLivePositions error:", err);
  }
  return [];
}

export async function createLiveOrder(intent: OrderIntent): Promise<ActivePosition | null> {
  try {
    const data = await executeGraphQL<{ createOrder: any }>(`
      mutation CreateLiveOrder($symbol: String!, $side: String!, $marginInr: Float, $tactic: String, $invalidation: String) {
        createOrder(symbol: $symbol, side: $side, marginInr: $marginInr, tactic: $tactic, invalidation: $invalidation) {
          symbol
          instrumentToken
          exchange
          side
          quantity
          entryPrice
          currentLtp
          pnlInr
          pnlPct
          mfePct
          stopFloorPct
          tactic
          invalidation
          brokerOrderId
          openedAt
          updatedAt
        }
      }
    `, {
      symbol: intent.symbol,
      side: intent.side,
      marginInr: intent.margin_inr,
      tactic: intent.tactic,
      invalidation: intent.invalidation,
    });
    if (data && data.createOrder) {
      const p = data.createOrder;
      return {
        symbol: p.symbol,
        instrument_token: p.instrumentToken,
        exchange: p.exchange,
        side: p.side,
        quantity: p.quantity,
        entry_price: p.entryPrice,
        current_ltp: p.currentLtp,
        pnl_inr: p.pnlInr,
        pnl_pct: p.pnlPct,
        mfe_pct: p.mfePct,
        stop_floor_pct: p.stopFloorPct,
        tactic: p.tactic,
        invalidation: p.invalidation,
        broker_order_id: p.brokerOrderId,
        opened_at: p.openedAt,
        updated_at: p.updatedAt,
      };
    }
  } catch (err) {
    console.error("Failed to create live order via GraphQL:", err);
    throw err;
  }
  return null;
}

export async function squareOffLivePosition(
  symbol: string,
  reason = "MANUAL_SQUARE_OFF"
): Promise<boolean> {
  try {
    const data = await executeGraphQL<{ squareOffPosition: boolean }>(`
      mutation SquareOff($symbol: String!, $reason: String) {
        squareOffPosition(symbol: $symbol, reason: $reason)
      }
    `, { symbol, reason });
    return Boolean(data?.squareOffPosition);
  } catch (err) {
    console.error("Failed to square off position:", err);
    return false;
  }
}

export async function fetchQuantBrainRules(): Promise<any[]> {
  try {
    const data = await executeGraphQL<{ brainRules: any[] }>(`
      query GetBrainRules {
        brainRules {
          id
          category
          name
          confidence
          triggerTime
          conditions
          action
          invalidation
          notes
        }
      }
    `);
    return data?.brainRules || [];
  } catch (err) {
    console.error("Failed to fetch quant brain rules:", err);
    return [];
  }
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
  prev_close?: number;
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
  const filter: FuturesInflowFilterParams = typeof params === "string" ? { date: params } : params || {};

  // Try GraphQL via Edge service
  try {
    const gql = `
      query GetFuturesInflow($date: String, $minPrice: Float, $maxPrice: Float, $minInflow: Float, $minOiPct: Float) {
        futuresInflow(date: $date, minPrice: $minPrice, maxPrice: $maxPrice, minInflow: $minInflow, minOiPct: $minOiPct) {
          sessionDate
          availableDates
          totalCount
          data {
            symbol
            tradingSymbol
            sessionDate
            futClose
            prevClose
            futOi
            prevOi
            totalNotionalCr
            price1dPct
            oi1dPct
            freshInflow1dCr
            oi3dPct
            freshInflow3dCr
          }
        }
      }
    `;

    const res = await fetch("http://127.0.0.1:8080/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: gql,
        variables: {
          date: filter.date || null,
          minPrice: filter.minPrice !== undefined ? filter.minPrice : null,
          maxPrice: filter.maxPrice !== undefined && filter.maxPrice < 10000 ? filter.maxPrice : null,
          minInflow: filter.minInflow !== undefined ? filter.minInflow : null,
          minOiPct: filter.minOiPct !== undefined ? filter.minOiPct : null,
        },
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.futuresInflow) {
        const inf = json.data.futuresInflow;
        // Normalize fields for backward-compat
        const normalizedData: FuturesInflowItem[] = (inf.data || []).map((d: any) => ({
          ...d,
          trading_symbol: d.tradingSymbol || d.trading_symbol,
          session_date: d.sessionDate || d.session_date,
          fut_close: d.futClose ?? d.fut_close ?? 0,
          prev_close: d.prevClose ?? d.prev_close ?? 0,
          fut_oi: d.futOi ?? d.fut_oi,
          prev_oi: d.prevOi ?? d.prev_oi,
          total_notional_cr: d.totalNotionalCr ?? d.total_notional_cr ?? 0,
          price_1d_pct: d.price1dPct ?? d.price_1d_pct ?? 0,
          oi_1d_pct: d.oi1dPct ?? d.oi_1d_pct ?? 0,
          fresh_inflow_1d_cr: d.freshInflow1dCr ?? d.fresh_inflow_1d_cr ?? 0,
          oi_3d_pct: d.oi3dPct ?? d.oi_3d_pct ?? 0,
          fresh_inflow_3d_cr: d.freshInflow3dCr ?? d.fresh_inflow_3d_cr ?? 0,
        }));

        return {
          session_date: inf.sessionDate,
          available_dates: inf.availableDates,
          total_count: inf.totalCount,
          data: normalizedData,
        };
      }
    }
  } catch (err) {
    console.warn("[GraphQL] Fallback to REST API:", err);
  }

  // REST fallback
  try {
    const base = getApiBase();
    const q = filter.date ? `date=${encodeURIComponent(filter.date)}&` : "";
    const res = await fetch(`${base}/v1/market/macro/futures-inflow?${q}_t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch futures macro data:", err);
  }

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
