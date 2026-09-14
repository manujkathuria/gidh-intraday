import { ReplaySector, ReplayStock } from "@/lib/api";

export type SectorPreset = "ALL" | "LEADERS" | "SURGES" | "LAGGARDS";

export type SectorSortField =
  | "sector"
  | "civ_count"
  | "avg_move_pct"
  | "pct_above_vwap"
  | "avg_rvol"
  | "advances"
  | "declines";

export interface SectorItemWithStocks extends ReplaySector {
  stocks?: ReplayStock[];
  advances?: number;
  declines?: number;
  topGainer?: ReplayStock;
  topLoser?: ReplayStock;
}
