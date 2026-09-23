import { executeGraphQL } from "./graphql";
import { auth } from "./firebase";

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

export const getStreamWsUrlWithAuth = async (path: string): Promise<string> => {
  const baseUrl = getStreamWsUrl(path);
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}auth=${encodeURIComponent(token)}`;
    }
  } catch (e) {
    // fallback to unauthenticated URL
  }
  return baseUrl;
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
  pdh?: number;
  pdl?: number;
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
          pdh
          pdl
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
          stopLossPrice
          targetPrice
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
        stop_loss_price: p.stopLossPrice,
        target_price: p.targetPrice,
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

export async function fetchClosedPositions(date?: string): Promise<ClosedPosition[]> {
  try {
    const data = await executeGraphQL<{ closedPositions: any[] }>(`
      query GetClosedPositions($date: String) {
        closedPositions(date: $date) {
          id
          symbol
          instrumentToken
          exchange
          side
          quantity
          entryPrice
          exitPrice
          pnlInr
          pnlPct
          openedAt
          closedAt
          exitReason
          brokerOrderId
        }
      }
    `, { date: date || null });

    if (data && data.closedPositions) {
      return data.closedPositions.map((p) => ({
        id: p.id,
        symbol: p.symbol,
        instrument_token: p.instrumentToken,
        exchange: p.exchange,
        side: p.side,
        quantity: p.quantity,
        entry_price: p.entryPrice,
        exit_price: p.exitPrice,
        pnl_inr: p.pnlInr,
        pnl_pct: p.pnlPct,
        opened_at: p.openedAt,
        closed_at: p.closedAt,
        exit_reason: p.exitReason,
        broker_order_id: p.brokerOrderId,
      }));
    }
  } catch (err) {
    console.warn("[GraphQL] fetchClosedPositions error:", err);
  }
  return [];
}

const managedOrderSelection = `
  id
  clientOrderId
  brokerOrderId
  orderType
  status
  symbol
  instrumentToken
  exchange
  side
  quantity
  marginInr
  limitPrice
  expectedStopPrice
  expectedTargetPrice
  actualFillPrice
  stopPrice
  targetPrice
  rejectionReason
  createdAt
  updatedAt
`;

const mapManagedOrder = (order: any): ManagedOrder => ({
  id: order.id,
  client_order_id: order.clientOrderId,
  broker_order_id: order.brokerOrderId,
  order_type: order.orderType,
  status: order.status,
  symbol: order.symbol,
  instrument_token: order.instrumentToken,
  exchange: order.exchange,
  side: order.side,
  quantity: order.quantity,
  margin_inr: order.marginInr,
  limit_price: order.limitPrice,
  expected_stop_price: order.expectedStopPrice,
  expected_target_price: order.expectedTargetPrice,
  actual_fill_price: order.actualFillPrice,
  stop_price: order.stopPrice,
  target_price: order.targetPrice,
  rejection_reason: order.rejectionReason,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
});

export async function fetchManagedOrders(): Promise<ManagedOrder[]> {
  const data = await executeGraphQL<{ managedOrders: any[] }>(`
    query ManagedOrders {
      managedOrders {
        ${managedOrderSelection}
      }
    }
  `);
  return (data?.managedOrders || []).map(mapManagedOrder);
}

export async function createLiveOrder(intent: OrderIntent): Promise<ManagedOrder | null> {
  try {
    const clientOrderId = intent.client_order_id ?? crypto.randomUUID();
    const commonInput = {
      clientOrderId,
      symbol: intent.symbol,
      side: intent.side,
      marginInr: intent.margin_inr ?? 10000,
      tactic: intent.tactic,
      invalidation: intent.invalidation ?? "15M_VWAP_CROSS",
    };
    if (intent.order_type === "LIMIT") {
      if (!intent.target_entry_price || intent.target_entry_price <= 0) {
        throw new Error("A positive limit price is required");
      }
      const data = await executeGraphQL<{ placeLimitOrder: any }>(`
        mutation PlaceLimitOrder($input: PlaceLimitOrderInput!) {
          placeLimitOrder(input: $input) {
            ${managedOrderSelection}
          }
        }
      `, { input: { ...commonInput, limitPrice: intent.target_entry_price } });
      return data?.placeLimitOrder ? mapManagedOrder(data.placeLimitOrder) : null;
    }

    const data = await executeGraphQL<{ placeMarketOrder: any }>(`
      mutation PlaceMarketOrder($input: PlaceMarketOrderInput!) {
        placeMarketOrder(input: $input) {
          ${managedOrderSelection}
        }
      }
    `, { input: commonInput });
    return data?.placeMarketOrder ? mapManagedOrder(data.placeMarketOrder) : null;
  } catch (err) {
    console.error("Failed to create live order via GraphQL:", err);
    throw err;
  }
  return null;
}

export async function squareOffLivePosition(
  symbol: string,
  reason = "MANUAL_SQUARE_OFF"
): Promise<ManagedOrder | null> {
  try {
    const data = await executeGraphQL<{ squareOffPosition: any }>(`
      mutation SquareOff($symbol: String!, $reason: String!) {
        squareOffPosition(symbol: $symbol, reason: $reason) {
          ${managedOrderSelection}
        }
      }
    `, { symbol, reason });
    return data?.squareOffPosition ? mapManagedOrder(data.squareOffPosition) : null;
  } catch (err) {
    console.error("Failed to square off position:", err);
    return null;
  }
}

export async function updateLivePositionLevels(
  symbol: string,
  stopLossPrice?: number | null,
  targetPrice?: number | null
): Promise<ActivePosition | null> {
  try {
    const data = await executeGraphQL<{ updatePositionLevels: any }>(`
      mutation UpdatePositionLevels($symbol: String!, $stopLossPrice: Float, $targetPrice: Float) {
        updatePositionLevels(symbol: $symbol, stopLossPrice: $stopLossPrice, targetPrice: $targetPrice) {
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
          stopLossPrice
          targetPrice
          tactic
          invalidation
          brokerOrderId
          openedAt
          updatedAt
        }
      }
    `, {
      symbol,
      stopLossPrice: stopLossPrice !== undefined && stopLossPrice !== null ? stopLossPrice : null,
      targetPrice: targetPrice !== undefined && targetPrice !== null ? targetPrice : null,
    });
    if (data?.updatePositionLevels) {
      const p = data.updatePositionLevels;
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
        stop_loss_price: p.stopLossPrice,
        target_price: p.targetPrice,
        tactic: p.tactic,
        invalidation: p.invalidation,
        broker_order_id: p.brokerOrderId,
        opened_at: p.openedAt,
        updated_at: p.updatedAt,
      };
    }
  } catch (err) {
    console.error("Failed to update position levels:", err);
    throw err;
  }
  return null;
}

export async function cancelLimitOrder(id: string): Promise<ManagedOrder | null> {
  const data = await executeGraphQL<{ cancelLimitOrder: any }>(`
    mutation CancelLimitOrder($id: ID!) {
      cancelLimitOrder(id: $id) {
        ${managedOrderSelection}
      }
    }
  `, { id });
  return data?.cancelLimitOrder ? mapManagedOrder(data.cancelLimitOrder) : null;
}

export interface RiskState {
  kill_switch: boolean;
  circuit_broken: boolean;
  reason?: string;
}

export async function fetchRiskState(): Promise<RiskState> {
  try {
    const data = await executeGraphQL<{ riskState: { killSwitch: boolean; circuitBroken: boolean; reason?: string } }>(`
      query GetRiskState {
        riskState {
          killSwitch
          circuitBroken
          reason
        }
      }
    `);
    if (data?.riskState) {
      return {
        kill_switch: data.riskState.killSwitch,
        circuit_broken: data.riskState.circuitBroken,
        reason: data.riskState.reason ?? undefined,
      };
    }
  } catch (err) {
    console.warn("[GraphQL] fetchRiskState error:", err);
  }
  return { kill_switch: false, circuit_broken: false };
}

export async function resetTripwire(): Promise<boolean> {
  try {
    const data = await executeGraphQL<{ resetTripwire: boolean }>(`
      mutation ResetTripwire {
        resetTripwire
      }
    `);
    return !!data?.resetTripwire;
  } catch (err) {
    console.error("[GraphQL] resetTripwire error:", err);
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

    const data = await executeGraphQL<{ futuresInflow: any }>(gql, {
      date: filter.date || null,
      minPrice: filter.minPrice !== undefined ? filter.minPrice : null,
      maxPrice: filter.maxPrice !== undefined && filter.maxPrice < 10000 ? filter.maxPrice : null,
      minInflow: filter.minInflow !== undefined ? filter.minInflow : null,
      minOiPct: filter.minOiPct !== undefined ? filter.minOiPct : null,
    });

    if (data && data.futuresInflow) {
      const inf = data.futuresInflow;
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
  try {
    const query = `
      query GetBrainSession($date: String, $brainId: String) {
        brainSession(date: $date, brainId: $brainId) {
          sessionDate
          brainId
          aiThesis
          decisionsJson
          sensoryFeaturesJson
          outcomesJson
          forensics
          createdAt
        }
      }
    `;
    const res = await executeGraphQL<{ brainSession: BrainSessionRecordRaw | null }>(query, { date, brainId });
    return res?.brainSession ?? null;
  } catch (err) {
    console.error("fetchBrainSession GraphQL error:", err);
    return null;
  }
}

export async function fetchBrainSessions(brainId?: string, limit?: number): Promise<BrainSessionRecordRaw[]> {
  try {
    const query = `
      query GetBrainSessions($brainId: String, $limit: Int) {
        brainSessions(brainId: $brainId, limit: $limit) {
          sessionDate
          brainId
          aiThesis
          decisionsJson
          sensoryFeaturesJson
          outcomesJson
          forensics
          createdAt
        }
      }
    `;
    const res = await executeGraphQL<{ brainSessions: BrainSessionRecordRaw[] }>(query, { brainId, limit });
    return res?.brainSessions ?? [];
  } catch (err) {
    console.error("fetchBrainSessions GraphQL error:", err);
    return [];
  }
}

export async function fetchBrainMemory(brainId: string): Promise<BrainMemoryRecordRaw | null> {
  try {
    const query = `
      query GetBrainMemory($brainId: String!) {
        brainMemory(brainId: $brainId) {
          brainId
          memoryStateJson
          updatedAt
        }
      }
    `;
    const res = await executeGraphQL<{ brainMemory: BrainMemoryRecordRaw | null }>(query, { brainId });
    return res?.brainMemory ?? null;
  } catch (err) {
    console.error("fetchBrainMemory GraphQL error:", err);
    return null;
  }
}

export async function fetchBrainAvailableDates(): Promise<string[]> {
  try {
    const query = `
      query GetBrainAvailableDates {
        brainAvailableDates
      }
    `;
    const res = await executeGraphQL<{ brainAvailableDates: string[] }>(query);
    return res?.brainAvailableDates ?? [];
  } catch (err) {
    console.error("fetchBrainAvailableDates GraphQL error:", err);
    return [];
  }
}


