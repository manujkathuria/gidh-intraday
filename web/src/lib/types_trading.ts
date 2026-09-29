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

export interface RiskState {
  kill_switch: boolean;
  circuit_broken: boolean;
  reason?: string;
}
