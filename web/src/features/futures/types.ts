import { FuturesInflowItem } from "@/lib/api";

export type BuildUpStance =
  | "ALL"
  | "LONG_BUILDUP"
  | "SHORT_BUILDUP"
  | "SHORT_COVERING"
  | "LONG_UNWINDING";

export type SortField =
  | "symbol"
  | "fut_close"
  | "price_1d_pct"
  | "oi_1d_pct"
  | "fresh_inflow_1d_cr"
  | "fresh_inflow_3d_cr"
  | "total_notional_cr";

export interface StanceInfo {
  key: BuildUpStance;
  label: string;
  badgeClass: string;
}

export function getBuildUpStance(pricePct: number, oiPct: number): StanceInfo {
  if (pricePct >= 0 && oiPct >= 0) {
    return {
      key: "LONG_BUILDUP",
      label: "Long Build",
      badgeClass: "bg-surface-muted text-foreground border-surface-border font-semibold",
    };
  }
  if (pricePct < 0 && oiPct >= 0) {
    return {
      key: "SHORT_BUILDUP",
      label: "Short Build",
      badgeClass: "bg-surface-muted text-foreground/80 border-surface-border font-medium",
    };
  }
  if (pricePct >= 0 && oiPct < 0) {
    return {
      key: "SHORT_COVERING",
      label: "Short Cover",
      badgeClass: "bg-surface text-foreground/70 border-surface-border font-normal",
    };
  }
  return {
    key: "LONG_UNWINDING",
    label: "Long Unwind",
    badgeClass: "bg-surface text-foreground/50 border-surface-border/60 font-normal",
  };
}
