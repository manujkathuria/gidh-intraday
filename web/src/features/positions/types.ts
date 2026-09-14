export interface PositionSlotItem {
  symbol: string;
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
}

export interface FnoSymbolItem {
  symbol: string;
  price: number;
  move_pct: number;
  rvol: number;
  sector: string;
  is_above_vwap: boolean;
}
