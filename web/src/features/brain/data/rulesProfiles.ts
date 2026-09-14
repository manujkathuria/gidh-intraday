import { BrainRule } from "../types";

export const PROFILES_RULES: BrainRule[] = [
  {
    id: "CHARACTER_COCHINSHIP_01",
    category: "CHARACTER",
    name: "COCHINSHIP — High-Beta Momentum Leader",
    confidence: 0.9,
    conditions: ["RVOL >= 5.0x", "Price > VWAP"],
    action:
      "When RVOL > 5x, trends 4-7% without touching VWAP. Give wider intraday breathing room.",
    notes: "Defence / Shipbuilder leader with explosive trending characteristics.",
  },

  {
    id: "CHARACTER_BANDHANBNK_02",
    category: "CHARACTER",
    name: "BANDHANBNK — 15M Close Respecter",
    confidence: 0.88,
    conditions: ["Heavy 1m opening wicks", "15m bar close confirmation"],
    action:
      "Ignore aggressive 1-minute shakeout wicks. Strictly respect 15m VWAP bar close for exits.",
    notes: "High retail participation creates early noise; 15m closes reveal institutional direction.",
  },
  {
    id: "CHARACTER_RBLBANK_03",
    category: "CHARACTER",
    name: "RBLBANK — Institutional Trend Long",
    confidence: 0.85,
    conditions: ["Sector resonance in Mid-tier Private Banks", "Price > VWAP"],
    action:
      "Persistent multi-day institutional flows; reliable VWAP-respecting trend runner.",
    notes: "Hold with standard milestone ratchets.",
  },
  {
    id: "CHARACTER_MAHABANK_04",
    category: "CHARACTER",
    name: "MAHABANK — Low-Priced PSU Bank Leader",
    confidence: 0.86,
    conditions: ["CANBK / PNB positive", "RVOL >= 4.0x"],
    action:
      "Explosive low-priced momentum leader. Trades in tight synchronicity with CANBK & PNB.",
    notes: "High beta relative to large PSU banks.",
  },
  {
    id: "CHARACTER_HDFCLIFE_05",
    category: "CHARACTER",
    name: "HDFCLIFE — Clean Breakdown Short",
    confidence: 0.87,
    conditions: ["Price < VWAP", "RVOL >= 3.0x", "Weak tape"],
    action:
      "High-volume clean breakdown short with persistent downward trend into 14:30.",
    notes: "Top shorting candidate when market breadth is bearish.",
  },
  {
    id: "CHARACTER_ICICIPRULI_06",
    category: "CHARACTER",
    name: "ICICIPRULI — Insurance Sector Mirror Short",
    confidence: 0.84,
    conditions: ["HDFCLIFE breaking down", "Price < VWAP"],
    action:
      "Mirror companion to HDFCLIFE. Strong short candidate on weak tape days.",
    notes: "High correlation with HDFCLIFE (> 0.85).",
  },
  {
    id: "CHARACTER_ONGC_07",
    category: "CHARACTER",
    name: "ONGC / OIL — Upstream Bull Trap Masters",
    confidence: 0.88,
    conditions: ["09:15 upper rejection wick", "CLV < 0.20", "Loss of VWAP"],
    action: "Gap-up fakeouts produce high-probability 09:45 trap shorts.",
    notes: "Retail buys the gap; institutions distribute and reverse.",
  },
  {
    id: "CHARACTER_LT_08",
    category: "CHARACTER",
    name: "LT — Heavyweight Institutional Benchmark",
    confidence: 0.82,
    conditions: ["RVOL > 3.0x", "Price vs VWAP"],
    action:
      "Institutional distribution shows as failed 09:30 breakouts. Strong directional proxy.",
    notes: "Heavyweight index component.",
  },
  {
    id: "CHARACTER_KEI_09",
    category: "CHARACTER",
    name: "KEI — High-Beta Cable Breakdown Runner",
    confidence: 0.81,
    conditions: ["15m VWAP break", "CLV < 0.15"],
    action: "Clean breakdowns once 15m VWAP is lost. Fast 2-3% moves.",
    notes: "Thin liquidity creates fast expansions.",
  },
  {
    id: "CHARACTER_IDEA_10",
    category: "CHARACTER",
    name: "IDEA — Ultra-Liquid Penny Momentum Vehicle",
    confidence: 0.8,
    conditions: ["RVOL >= 10.0x", "Massive order book volume"],
    action: "Massive directional trending on RVOL > 10x with high liquidity.",
    notes: "Requires tight tick-level monitoring.",
  },
];
