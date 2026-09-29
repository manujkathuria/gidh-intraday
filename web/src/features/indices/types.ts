import { IndexItem } from "@/lib/types_market";

export type IndexCategoryFilter = "ALL" | "BENCHMARK" | "SECTOR" | "SPECIAL";

export type IndexSortField =
  | "symbol"
  | "spot_price"
  | "change_pct"
  | "change_pts"
  | "advances"
  | "declines"
  | "vwap";
