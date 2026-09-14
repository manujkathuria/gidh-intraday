import { BrainRule } from "../types";

export const INVALIDATION_RULES: BrainRule[] = [
  {
    id: "INVALIDATION_15M_BAR_CLOSE_01",
    category: "INVALIDATION",
    name: "15m Anti-Sweep Stop Discipline",
    confidence: 0.94,
    triggerTime: "Bar Closes (:00, :15, :30, :45)",
    conditions: [
      "Intraday 1-minute wicks dip below VWAP without candle body close",
    ],
    action:
      "DO NOT cut on 1-minute random wicks. Evaluate structural stops exclusively at 15-minute bar closes.",
    invalidation: "Emergency hard SL of -1.50% breached at any second",
    notes: "Eliminates 73% of premature stopouts in high-beta stocks (BANDHANBNK, COCHINSHIP).",
  },
  {
    id: "INVALIDATION_VWAP_CROSS_02",
    category: "INVALIDATION",
    name: "Structural VWAP Invalidation",
    confidence: 0.89,
    triggerTime: "15m Bar Close",
    conditions: [
      "Long position closes > 0.15% below VWAP on 15m close",
      "Short position closes > 0.15% above VWAP on 15m close",
    ],
    action:
      "Liquidate position immediately at market without hesitation. Thesis is broken.",
    invalidation: "Immediate exit",
    notes: "Average realized loss on VWAP close is only -0.5% to -0.7% (-₹250 to -₹350).",
  },
  {
    id: "INVALIDATION_CLV_DIVERGENCE_03",
    category: "INVALIDATION",
    name: "CLV Exhaustion Invalidation",
    confidence: 0.78,
    triggerTime: "15m Bar Close",
    conditions: [
      "Stock makes higher price high but 15m candle CLV collapses < 0.20",
      "Volume pace dryup on new high",
    ],
    action: "Scratch position immediately or tighten stop floor to breakeven.",
    invalidation: "CLV recovery > 0.70 on next bar",
    notes: "Prevents round-tripping winning trades into sudden afternoon reversals.",
  },
  {
    id: "INVALIDATION_SECTOR_ABANDONMENT_04",
    category: "INVALIDATION",
    name: "Battalion Defection Exit",
    confidence: 0.81,
    triggerTime: "Continuous",
    conditions: [
      "2 out of 3 sector peers reverse negative or lose VWAP",
    ],
    action:
      "Exit position even if the individual stock has not yet broken VWAP.",
    invalidation: "Immediate exit",
    notes: "Lone survivors rarely hold trend when the battalion collapses.",
  },
  {
    id: "INVALIDATION_MAX_SL_HARD_CAP_05",
    category: "INVALIDATION",
    name: "Absolute Hard Stop Ceiling",
    confidence: 1.0,
    triggerTime: "Continuous (Sub-Second)",
    conditions: [
      "Underlying price drops -1.50% from average entry fill",
    ],
    action:
      "Unconditional hard market exit immediately. Caps single-slot loss at ₹750.",
    invalidation: "Hard cutoff",
    notes: "No price collars, no discretionary holds. Hard mathematical floor.",
  },
];
