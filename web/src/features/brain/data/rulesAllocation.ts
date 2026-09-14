import { BrainRule } from "../types";

export const ALLOCATION_RULES: BrainRule[] = [
  {
    id: "ALLOCATION_FIXED_5_SLOTS_01",
    category: "ALLOCATION",
    name: "5-Slot Equal Geometry & Leverage Sizing",
    confidence: 1.0,
    triggerTime: "Pre-Market / Continuous",
    conditions: [
      "Total Capital Pool: ₹50,000",
      "5x MIS Leverage -> ₹2,50,000 Gross Exposure Pool",
      "Exactly 5 Slots x ₹10,000 Margin per position",
    ],
    action:
      "Size each position dynamically to ₹50,000 gross equity using ₹10,000 margin. Strict single-slot allocation.",
    invalidation: "Adverse underlying price move reaches -1.50% (-₹750 SL Floor)",
    notes:
      "A -1.50% stock move equals -7.50% on ₹10k margin (-₹750). Max total portfolio risk capped at ₹3,750 (7.5%).",
  },
  {
    id: "ALLOCATION_TIME_STAGED_FILLS_02",
    category: "ALLOCATION",
    name: "Staged Time Deployment",
    confidence: 0.88,
    triggerTime: "09:30 & 09:45 IST",
    conditions: [
      "Slots 1-3 deployed at 09:30 15m bar close",
      "Slots 4-5 reserved for 09:45 confirmed squeezes & trap shorts",
    ],
    action:
      "Never fire all 5 slots at the opening bell. Stage entries across 09:30 and 09:45 to diversify intraday timing.",
    invalidation: "09:30 breadth < 35% with no valid Paladin leaders",
    notes: "Protects capital from opening fakeouts and spreads liquidity capture.",
  },
  {
    id: "ALLOCATION_DAILY_LOSS_CIRCUIT_03",
    category: "ALLOCATION",
    name: "Daily Portfolio Circuit Breaker",
    confidence: 1.0,
    triggerTime: "Anytime",
    conditions: [
      "Realized cumulative intraday loss reaches -₹2,000 (-4.0% on ₹50k capital)",
    ],
    action:
      "Immediately halt all automated and manual trading. Cancel pending orders and liquidate open positions.",
    invalidation: "Hard terminal kill-switch",
    notes: "Preserves mental and quantitative capital on hostile market days.",
  },
];
