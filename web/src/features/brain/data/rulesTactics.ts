import { BrainRule } from "../types";

export const TACTICS_RULES: BrainRule[] = [
  {
    id: "ENTRY_PALADIN_01",
    category: "ENTRY",
    name: "Mega-RVOL Momentum Leader Long",
    confidence: 0.85,
    triggerTime: "09:30 or 09:45 Bar Close",
    conditions: [
      "RVOL >= 10.0x (Extreme institutional volume surge)",
      "Price > Session VWAP",
      "Return from Open > +1.0%",
      "CLV >= 0.50 (Upper half bar close)",
    ],
    action:
      "Deploy ₹10,000 margin immediately as Priority 1 Long. Market order with zero price collar.",
    invalidation: "15m candle close > 0.15% below VWAP",
    notes: "Highest win rate setup in the quant engine (78.2% historical win rate).",
  },
  {
    id: "ENTRY_BATTALION_RESONANCE_02",
    category: "ENTRY",
    name: "Battalion Synchronicity Long",
    confidence: 0.82,
    triggerTime: "09:30 or 09:45 Bar Close",
    conditions: [
      ">= 2 sector peers trading > VWAP",
      "Sector mean RVOL >= 2.5x",
      "Stock is highest RVOL / highest CLV in sector cluster",
    ],
    action:
      "Buy the sector champion stock with ₹10,000 margin on 15m bar close confirmation.",
    invalidation: "2 out of 3 sector peers lose VWAP or turn negative",
    notes: "Sector tide lifts high-RVOL leaders; structural institutional buying.",
  },
  {
    id: "ENTRY_MANIPULATED_TRAP_SHORT_03",
    category: "ENTRY",
    name: "Upper Wick / 0.000 CLV Trap Short",
    confidence: 0.88,
    triggerTime: "09:30 or 09:45 Bar Close",
    conditions: [
      "Opening 15m candle left >= 50% upper rejection wick",
      "CLV <= 0.20 (Closed near absolute candle low)",
      "RVOL >= 2.0x",
      "Price breaking below Session VWAP",
    ],
    action:
      "Enter MIS Short immediately. Target morning liquidity purge and weak longs trapped at highs.",
    invalidation: "15m candle close > 0.15% above VWAP",
    notes: "Frequent in Upstream Energy (ONGC, OIL) and high-beta momentum stocks.",
  },
  {
    id: "ENTRY_BREAKDOWN_MOMENTUM_04",
    category: "ENTRY",
    name: "High-RVOL Institutional Breakdown Short",
    confidence: 0.8,
    triggerTime: "09:30 or 09:45 Bar Close",
    conditions: [
      "RVOL >= 4.0x",
      "Price < Session VWAP",
      "Return from Open < -1.0%",
      "CLV <= 0.15",
    ],
    action:
      "Enter Short with institutional distribution flow. Target persistent downward trend into 14:30.",
    invalidation: "15m candle close > 0.15% above VWAP",
    notes: "Prime vehicles: Life Insurance (HDFCLIFE, ICICIPRULI), weak metals.",
  },
  {
    id: "ENTRY_SQUEEZE_REVERSAL_05",
    category: "ENTRY",
    name: "Opening Range Contraction Squeeze",
    confidence: 0.76,
    triggerTime: "09:45 Bar Close",
    conditions: [
      "09:45 volume expands > 1.5x vs 09:30 contraction candle",
      "Breaking 30-minute high/low range",
      "Extreme CLV (> 0.80 for Long or < 0.10 for Short)",
    ],
    action: "Enter in direction of confirmed 09:45 range expansion.",
    invalidation: "Opposite 15m boundary breach or VWAP loss",
    notes: "Captures second-wave momentum after initial morning shakeout.",
  },
];
