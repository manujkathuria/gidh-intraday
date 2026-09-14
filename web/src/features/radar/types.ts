export type SortField =
  | "symbol"
  | "sector"
  | "price"
  | "move_pct"
  | "rvol"
  | "vwap_dist_pct"
  | "clv"
  | "volume";

export type VwapFilter = "ALL" | "ABOVE" | "BELOW";

export interface SectorOption {
  sector: string;
  label: string;
}
