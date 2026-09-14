export type SortField =
  | "symbol"
  | "sector"
  | "price"
  | "move_pct"
  | "rvol"
  | "vwap_dist_pct"
  | "volume";

export type RadarPreset = "ALL" | "SURGES" | "LEADERS" | "DUMPERS";

export interface SectorOption {
  sector: string;
  label: string;
  count?: number;
  avgMovePct?: number;
}
