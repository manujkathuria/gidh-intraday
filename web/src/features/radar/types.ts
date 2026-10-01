export type SortField =
  | "symbol"
  | "price"
  | "pts"
  | "move_pct"
  | "rvol"
  | "vwap_dist_pct"
  | "pd_context"
  | "futures_oi"
  | "volume";

export type RadarPreset = "ALL" | "SURGES";

export type VwapFilter =
  | "ALL"
  | "NEAR_VWAP"
  | "ABOVE_1S"
  | "ABOVE_2S"
  | "BELOW_1S"
  | "BELOW_2S";
