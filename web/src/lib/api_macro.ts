import { getApiBase } from "./api_client";

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

export async function fetchQuantBrainRules(): Promise<any[]> {
  return [];
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

export async function fetchBrainMemory(_brainId: string): Promise<any | null> {
  return null;
}

export async function fetchBrainAvailableDates(): Promise<string[]> {
  return [];
}

export interface FuturesInflowItem {
  symbol: string;
  trading_symbol: string;
  expiry?: string;
  lot_size?: number;
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
  try {
    const q = new URLSearchParams();
    if (filter.date) q.append("date", filter.date);
    if (filter.minPrice !== undefined) q.append("minPrice", filter.minPrice.toString());
    if (filter.maxPrice !== undefined) q.append("maxPrice", filter.maxPrice.toString());
    if (filter.minInflow !== undefined) q.append("minInflow", filter.minInflow.toString());
    if (filter.minOiPct !== undefined) q.append("minOiPct", filter.minOiPct.toString());

    const base = getApiBase();
    const res = await fetch(`${base}/api/market/macro/futures-inflow?${q.toString()}`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("fetchFuturesInflow error:", err);
  }
  return null;
}
