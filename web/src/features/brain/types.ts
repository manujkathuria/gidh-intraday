export interface FocusCandidate {
  symbol: string;
  sector: string;
  prior_close: number;
  inflow_1d_cr: number;
  inflow_3d_cr?: number | null;
  fuel_pct: number;
  cpr_width_pct: number;
  conviction_score?: number;
  thesis?: string;
  stance?: string | null;
}

export interface MacroSessionData {
  session_date: string;
  brain_id: string;
  macro_regime_label: string;
  leading_sector: string;
  lagging_sector: string;
  ai_thesis: string;
  universe_net_inflow_1d_cr?: number;
  universe_net_inflow_3d_cr?: number;
  universe_advances?: number;
  universe_declines?: number;
  focus_bulls: FocusCandidate[];
  focus_bears: FocusCandidate[];
  exhaustion_traps: FocusCandidate[];
}

export interface MicroTradeOrder {
  symbol: string;
  direction: "LONG" | "SHORT";
  selection_rank: number;
  target_entry_price: number;
  invalidation_price: number;
  target_1: number;
  target_2: number;
  risk_reward_ratio: number;
  execution_tactic: string;
  thesis: string;
  // Execution status if simulated
  filled?: boolean;
  actual_entry_price?: number;
  exit_price?: number;
  pnl_pct?: number;
  r_multiple_captured?: number;
  status?: "WIN" | "LOSS" | "MISSED" | "ACTIVE";
  forensics_note?: string;
}

export interface MicroSessionData {
  session_date: string;
  brain_id: string;
  ai_thesis: string;
  selected_trades: MicroTradeOrder[];
  net_r_multiple?: number;
  win_rate?: number;
  forensics_summary?: string;
}

export interface BrainMemoryData {
  brain_id: string;
  last_session_date: string;
  learned_rules: string[];
  active_campaigns: Record<string, string>;
  last_forensics?: string;
  rolling_stats?: {
    win_rate_pct?: number;
    avg_expansion_pct?: number;
    avg_drawdown_pct?: number;
    total_r_captured?: number;
  };
}

export interface QuantBrainState {
  macroSessions: MacroSessionData[];
  microSessions: MicroSessionData[];
  macroMemory: BrainMemoryData | null;
  microMemory: BrainMemoryData | null;
  selectedDate: string;
  availableDates: string[];
}
