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
  time: number;
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
  developing_poc?: number;
}

export interface MarketStatus {
  isLive: boolean;
  liveDate?: string;
  lastTickAgeMs?: number;
}

export interface IndexItem {
  symbol: string;
  name: string;
  category?: "BENCHMARK" | "SECTOR" | "GLOBAL_CUE" | "VOLATILITY" | string;
  spot_price: number;
  prev_close: number;
  change_pts: number;
  change_pct: number;
  high?: number;
  low?: number;
  vwap?: number;
  advances?: number;
  declines?: number;
  top_gainer?: string;
  top_loser?: string;
}

export interface HeavyweightImpact {
  symbol: string;
  name: string;
  weight_pct: number;
  price: number;
  change_pct: number;
  point_impact: number;
}

export interface GiftNiftyInfo {
  price: number;
  nifty_prev_close: number;
  gap_pts: number;
  gap_pct: number;
  sentiment: string;
}

export interface VixInfo {
  value: number;
  change_pct: number;
  regime: string;
}

export interface IndicesDashboardResponse {
  session_date: string;
  available_dates: string[];
  gift_nifty?: GiftNiftyInfo;
  india_vix?: VixInfo;
  benchmarks?: IndexItem[];
  sector_indices?: IndexItem[];
  heavyweights?: HeavyweightImpact[];
  indices?: IndexItem[];
}

