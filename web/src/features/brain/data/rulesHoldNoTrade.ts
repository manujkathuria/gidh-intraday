import { BrainRule } from "../types";

export const HOLD_NO_TRADE_RULES: BrainRule[] = [
  // HOLD & RATCHET
  {
    id: "HOLD_RATCHET_MILESTONES_03",
    category: "HOLD",
    name: "Milestone Trailing Floor Ratchet",
    confidence: 0.92,
    triggerTime: "Sub-Second Tick Feed",
    conditions: [
      "MFE >= +1.50% -> Ratchet Stop Floor to Breakeven (0.00%)",
      "MFE >= +2.00% -> Ratchet Stop Floor to +1.00% Profit Lock",
      "MFE >= +3.50% -> Ratchet Stop Floor to +2.50% Profit Lock",
    ],
    action:
      "Automatically raise stop floor at each milestone. Never let a +1.50% winner turn red.",
    invalidation: "Price crosses below ratcheted floor",
    notes: "Guarantees locking profits on runners while allowing multi-percent runners.",
  },
  {
    id: "HOLD_SPLIT_EXIT_1130_01",
    category: "HOLD",
    name: "11:30 Mandatory Split-Exit Checkpoint",
    confidence: 0.87,
    triggerTime: "11:30 IST",
    conditions: [
      "Position has RVOL < 5.0x (Tier 3 stock)",
      "P&L is stagnant between -0.3% and +0.3% or hovering near VWAP",
    ],
    action:
      "Square off stagnant Tier 3 positions before lunch lull. Only Mega-RVOL Paladins and strong Battalion runners hold past 11:30.",
    invalidation: "RVOL expansion > 6.0x",
    notes: "Eliminates capital lockup during low-volatility midday hours.",
  },
  {
    id: "HOLD_SHORT_EXTENSION_02",
    category: "HOLD",
    name: "Afternoon Short Extension",
    confidence: 0.84,
    triggerTime: "11:30 – 14:30 IST",
    conditions: [
      "Short position strictly holding below VWAP past 11:30",
      "Market breadth < 40% (Bearish realm)",
    ],
    action:
      "Hold through lunch into the 14:30 / 15:15 checkpoint for maximum range expansion.",
    invalidation: "15m candle close above VWAP",
    notes: "Shorts in weak sectors often experience cascading stop-loss runs into the close.",
  },

  // NO-TRADE FILTERS
  {
    id: "NO_TRADE_LUNCH_LULL_01",
    category: "NO_TRADE",
    name: "Lunch Lull Exclusion Zone (11:30 – 13:45)",
    confidence: 0.95,
    triggerTime: "11:30 – 13:45 IST",
    conditions: ["Time between 11:30 AM and 01:45 PM IST"],
    action:
      "ZERO fresh positions initiated. Only manage existing open positions and stop ratchets.",
    invalidation: "Exceptional news-driven RVOL > 15x",
    notes: "Historical win rate during lunch hours drops from 68% to 32% due to algorithmic chop.",
  },
  {
    id: "NO_TRADE_RED_ABOVE_VWAP_TRAP_02",
    category: "NO_TRADE",
    name: "Red Stock Above VWAP Trap",
    confidence: 0.86,
    triggerTime: "09:30 – 10:30 IST",
    conditions: [
      "Stock opened with large gap down (-2% to -4%)",
      "Drifted slightly above VWAP but remains net negative on the day",
    ],
    action: "DO NOT buy. Wait for positive day return or short the failed bounce.",
    invalidation: "Return from Prior Close turns positive (> 0.0%)",
    notes: "Common bull trap: counter-trend bounce into overhead supply.",
  },
  {
    id: "NO_TRADE_LONE_WOLF_NO_BATTALION_03",
    category: "NO_TRADE",
    name: "Lone Wolf Without Sector Confirmation",
    confidence: 0.83,
    triggerTime: "Opening Session",
    conditions: [
      "Single stock breaking out with RVOL < 8.0x",
      "Sector peers are flat, negative, or trading below VWAP",
    ],
    action: "Pass on trade. Demand sector resonance or Mega-RVOL (> 8x) for standalone plays.",
    invalidation: "RVOL surges >= 8.0x",
    notes: "Isolated breakouts lack institutional follow-through and frequently fail.",
  },
];
