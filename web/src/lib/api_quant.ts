export interface MacroSelectionItem {
  id: number;
  instrument_id: number;
  symbol: string;
  sector: string;
  side: "SHORT" | "LONG";
  setup_type: "PDL_BREAKDOWN" | "PDH_BREAKOUT";
  rvol: number;
  price: number;
  vwap: number;
  sigma: number;
  vwap_plus_1s: number;
  vwap_plus_2s: number;
  vwap_minus_1s: number;
  vwap_minus_2s: number;
  pdh: number;
  pdl: number;
  prior_close: number;
  day_change_pct: number;
  vwap_dist_pct: number;
  clv: number;
  future_close?: number | null;
  futures_basis?: number | null;
  futures_basis_pct?: number | null;
  oi_change_session?: number | null;
  oi_structure?: "SHORT_BUILDUP" | "LONG_UNWINDING" | "LONG_BUILDUP" | "SHORT_COVERING" | "NO_FUTURES" | null;
  rank: number;
}

export interface MacroRunResponse {
  run_id: string;
  session_date: string;
  snapshot_time: string;
  total_scanned: number;
  shorts_count: number;
  longs_count: number;
  created_at?: string;
  shorts: MacroSelectionItem[];
  longs: MacroSelectionItem[];
}

export const getQuantApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_QUANT_API_URL) {
    return process.env.NEXT_PUBLIC_QUANT_API_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://127.0.0.1:8001";
    }
    return `http://${window.location.hostname}:8001`;
  }
  return "http://127.0.0.1:8001";
};

export async function fetchMacroLatest(): Promise<MacroRunResponse | null> {
  try {
    const res = await fetch(`${getQuantApiBase()}/api/quant/macro/latest`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("fetchMacroLatest error:", err);
  }
  return null;
}

export async function fetchMacroHistory(date: string): Promise<MacroRunResponse | null> {
  try {
    const res = await fetch(`${getQuantApiBase()}/api/quant/macro/history?date=${encodeURIComponent(date)}`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("fetchMacroHistory error:", err);
  }
  return null;
}

export async function fetchMacroDates(): Promise<string[]> {
  try {
    const res = await fetch(`${getQuantApiBase()}/api/quant/macro/dates`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.dates || [];
    }
  } catch (err) {
    console.error("fetchMacroDates error:", err);
  }
  return [];
}

export interface MacroLevelZone {
  top: number;
  bottom: number;
  date: string;
}

export interface MacroLevelsData {
  pwh?: number | null;
  pwl?: number | null;
  pdh?: number | null;
  pdl?: number | null;
  swing_res?: number | null;
  swing_sup?: number | null;
  clv_supply_zones?: MacroLevelZone[];
  clv_demand_zones?: MacroLevelZone[];
  clv_rej_1?: number | null;
  clv_rej_2?: number | null;
  clv_def_1?: number | null;
  clv_def_2?: number | null;
}

export interface MacroLevelsResponse {
  symbol: string;
  session_date: string;
  levels: MacroLevelsData;
}

export interface MacroDailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pwh?: number | null;
  pwl?: number | null;
  clv?: number | null;
  swing_high?: number | null;
  swing_low?: number | null;
  swing_label?: string;
}

export interface MacroIntradayCandle {
  ts: string;
  ts_ist: string;
  time_str: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number | null;
}

export async function fetchMacroSymbols(): Promise<string[]> {
  try {
    const res = await fetch(`${getQuantApiBase()}/api/quant/macro/symbols`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.symbols || [];
    }
  } catch (err) {
    console.error("fetchMacroSymbols error:", err);
  }
  return [];
}

export async function fetchMacroDaily(symbol: string, date: string, limit = 120): Promise<MacroDailyCandle[]> {
  if (!symbol || !date) return [];
  try {
    const res = await fetch(
      `${getQuantApiBase()}/api/quant/macro/daily?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}&limit=${limit}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      return data.candles || [];
    }
  } catch (err) {
    console.error(`fetchMacroDaily error for ${symbol} on ${date}:`, err);
  }
  return [];
}

export async function fetchMacroIntraday(
  symbol: string,
  date: string
): Promise<{ candles: MacroIntradayCandle[]; levels: MacroLevelsData } | null> {
  if (!symbol || !date) return null;
  try {
    const res = await fetch(
      `${getQuantApiBase()}/api/quant/macro/intraday?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        candles: data.candles || [],
        levels: data.levels || {},
      };
    }
  } catch (err) {
    console.error(`fetchMacroIntraday error for ${symbol} on ${date}:`, err);
  }
  return null;
}

export async function fetchMacroLevels(symbol: string, date: string): Promise<MacroLevelsData | null> {
  if (!symbol || !date) return null;
  try {
    const res = await fetch(
      `${getQuantApiBase()}/api/quant/macro/levels?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data: MacroLevelsResponse = await res.json();
      return data.levels || null;
    }
  } catch (err) {
    console.error(`fetchMacroLevels error for ${symbol} on ${date}:`, err);
  }
  return null;
}
