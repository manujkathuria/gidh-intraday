import { BrainRule } from "../types";

export const BATTALIONS_RULES: BrainRule[] = [
  {
    id: "BATTALION_PSU_BANKS_01",
    category: "BATTALION",
    name: "PSU Bank Battalion (CANBK, PNB, MAHABANK, SBIN, BANKBARODA)",
    confidence: 0.92,
    conditions: [">= 2 members > VWAP", "Sector RVOL >= 3.0x"],
    action:
      "Explosive opening synchronicity. When >= 2 fire, sector runs all day.",
    notes: "Highest beta sector cluster in the Indian market.",
  },
  {
    id: "BATTALION_PRIVATE_BANKS_02",
    category: "BATTALION",
    name: "Mid/Private Bank Battalion (BANDHANBNK, RBLBANK, FEDERALBNK, IDFCFIRSTB)",
    confidence: 0.86,
    conditions: ["Opening whipsaws settling into 15m closes"],
    action: "High beta opening whipsaws that strictly respect 15m closes.",
    notes: "High intraday liquidity and reliable trends.",
  },
  {
    id: "BATTALION_LIFE_INSURANCE_03",
    category: "BATTALION",
    name: "Life Insurance Battalion (HDFCLIFE, ICICIPRULI, SBILIFE)",
    confidence: 0.88,
    conditions: ["High intra-sector correlation (> 0.85)", "Loss of VWAP"],
    action:
      "Top shorting vehicles on weak tape days with consistent downward drift.",
    notes: "Institutional flow dominates; low retail interference.",
  },
  {
    id: "BATTALION_UPSTREAM_ENERGY_04",
    category: "BATTALION",
    name: "Upstream Energy Battalion (ONGC, OIL, GAIL)",
    confidence: 0.85,
    conditions: ["Gap-up open with rejection wicks"],
    action: "Prime 09:45 trap short sector.",
    notes: "Crude oil news often creates exaggerated opening gaps that fade.",
  },
  {
    id: "BATTALION_DEFENCE_05",
    category: "BATTALION",
    name: "Defence & Shipbuilding Battalion (COCHINSHIP, MAZDOCK, GRSE, HAL, BDL)",
    confidence: 0.9,
    conditions: ["Institutional order book surge", "RVOL >= 4.0x"],
    action:
      "Institutional momentum leaders with 5%+ daily ranges. Prime long candidates.",
    notes: "High relative strength when market breadth is neutral/bullish.",
  },
];
