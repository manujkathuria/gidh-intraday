"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { HeaderControls } from "@/components/HeaderControls";
import {
  Brain,
  Shield,
  Search,
  Zap,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface BrainRule {
  id: string;
  category:
    | "ALLOCATION"
    | "ENTRY"
    | "INVALIDATION"
    | "HOLD"
    | "NO_TRADE"
    | "CHARACTER"
    | "BATTALION";
  name: string;
  confidence: number;
  triggerTime?: string;
  conditions: string[];
  action: string;
  invalidation?: string;
  notes?: string;
}

const BRAIN_RULES: BrainRule[] = [
  // 1. ALLOCATION & GEOMETRY
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

  // 2. ENTRY TACTICS
  {
    id: "ENTRY_PALADIN_01",
    category: "ENTRY",
    name: "Mega-RVOL Paladin Leader Long",
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

  // 3. INVALIDATION & CUT RULES
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

  // 4. HOLD & RATCHET RULES
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

  // 5. NO-TRADE FILTERS
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

  // 6. CHARACTER PROFILES
  {
    id: "CHARACTER_COCHINSHIP_01",
    category: "CHARACTER",
    name: "COCHINSHIP — High-Beta Momentum Paladin",
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
    action:
      "Gap-up fakeouts produce high-probability 09:45 trap shorts.",
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
    action:
      "Massive directional trending on RVOL > 10x with high liquidity.",
    notes: "Requires tight tick-level monitoring.",
  },

  // 7. SECTOR BATTALIONS
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
    action:
      "High beta opening whipsaws that strictly respect 15m closes.",
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

const CATEGORIES = [
  { key: "ALL", label: "All Rules (34)" },
  { key: "ALLOCATION", label: "Allocation & Geometry (3)" },
  { key: "ENTRY", label: "Entry Tactics (5)" },
  { key: "INVALIDATION", label: "Invalidation & Cuts (5)" },
  { key: "HOLD", label: "Hold & Ratchets (3)" },
  { key: "NO_TRADE", label: "No-Trade Filters (3)" },
  { key: "CHARACTER", label: "Character Profiles (10)" },
  { key: "BATTALION", label: "Sector Battalions (5)" },
];

export default function QuantBrainPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredRules = useMemo(() => {
    return BRAIN_RULES.filter((r) => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.conditions.some((c) => c.toLowerCase().includes(q)) ||
        (r.invalidation && r.invalidation.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />

      <div className="w-full px-6 py-5 flex-1 flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Top Intelligence Hero Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Distilled Rules Count */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Operating Brain
              </span>
              <span className="p-1.5 rounded-md bg-surface-muted text-foreground/70 border border-surface-border">
                <Brain className="w-4 h-4" />
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-black text-foreground">
                34 Active Rules
              </div>
              <span className="text-xs text-foreground/50">
                100% Executable Distilled Logic
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-foreground/50">
              <span>Database Sync</span>
              <span className="font-bold text-foreground">quant.brain_rules</span>
            </div>
          </div>

          {/* Card 2: Replay Proven Edge */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Replay Proven Edge
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground">
                45 SESSIONS
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-black text-foreground">
                +68.87% Net P&L
              </div>
              <span className="text-xs text-foreground/50">
                66.1% Win Rate · 3.42 Profit Factor
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-foreground/50">
              <span>Audited Trades</span>
              <span className="font-bold text-foreground">180 Verified Trades</span>
            </div>
          </div>

          {/* Card 3: Trading Geometry */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Trading Geometry
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/80">
                5x MIS
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-black text-foreground">
                5 Slots × ₹10k
              </div>
              <span className="text-xs text-foreground/50">
                ₹50k Gross Equity Exposure per Slot
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-foreground/50">
              <span>Max SL Floor</span>
              <span className="font-bold text-foreground">-1.50% (-₹750 Risk)</span>
            </div>
          </div>

          {/* Card 4: Operating Discipline */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Execution Model
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground">
                DISCIPLINE
              </span>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-black text-foreground">
                15m Bar Close
              </div>
              <span className="text-xs text-foreground/50">
                Anti-Sweep Stops · Unconditional Market Exit
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] text-foreground/50">
              <span>Daily Kill-Switch</span>
              <span className="font-bold text-foreground">-₹2,000 (-4.0%)</span>
            </div>
          </div>
        </div>

        {/* Pre-Market Protocol & Time Milestones Bar */}
        <div className="bg-surface border border-surface-border rounded-xl p-4 font-mono text-xs shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-surface-border pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-foreground/70" />
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                Daily Operating Time Protocol & Session Milestones
              </h2>
            </div>
            <span className="text-[11px] text-foreground/50">
              IST (Indian Standard Time)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">08:45 AM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                Pre-Open Wakeup & Daily CPR/ADR Calculation
              </span>
            </div>

            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">09:07 AM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                Pre-Open Discovery & Gap Rankings
              </span>
            </div>

            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">09:30 AM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                15M Bar 1 Close: Slots 1-3 Deployment
              </span>
            </div>

            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">09:45 AM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                Slots 4-5 Squeeze & Trap Short Deployment
              </span>
            </div>

            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">11:30 AM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                Mandatory Split-Exit (Cut Tier 3 runners)
              </span>
            </div>

            <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
              <span className="font-bold text-foreground">15:15 PM</span>
              <span className="text-[10px] text-foreground/60 leading-tight">
                Mandatory MIS Intraday Square-Off
              </span>
            </div>
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
          {/* Categories Pill Nav */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition border ${
                  selectedCategory === cat.key
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              placeholder="Search rule, symbol, condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-foreground/40 focus:outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {/* Rule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {filteredRules.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-foreground/40 bg-surface border border-surface-border rounded-xl">
              No rules found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-surface border border-surface-border rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-surface-border/80 transition"
              >
                {/* Rule Header */}
                <div className="flex items-start justify-between gap-2 border-b border-surface-border pb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
                        {rule.id}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground/50">
                        {rule.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-foreground tracking-tight">
                      {rule.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-foreground/40 block">
                      Confidence
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {(rule.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Timing Trigger */}
                {rule.triggerTime && (
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/60">
                    <Clock className="w-3.5 h-3.5 text-foreground/40" />
                    <span>Trigger:</span>
                    <span className="font-bold text-foreground">
                      {rule.triggerTime}
                    </span>
                  </div>
                )}

                {/* Conditions List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-foreground/40 uppercase block">
                    Quantitative Conditions:
                  </span>
                  <ul className="space-y-1 text-[11px] text-foreground/80 pl-2">
                    {rule.conditions.map((cond, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-foreground/40">•</span>
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Blueprint */}
                <div className="p-3 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-foreground/50">
                    <Target className="w-3 h-3 text-foreground/60" />
                    <span>Execution Action:</span>
                  </div>
                  <p className="text-[11px] font-bold text-foreground leading-relaxed">
                    {rule.action}
                  </p>
                </div>

                {/* Invalidation / Notes Footer */}
                {(rule.invalidation || rule.notes) && (
                  <div className="pt-2 border-t border-surface-border flex flex-col gap-1 text-[10px] text-foreground/50">
                    {rule.invalidation && (
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-foreground/60 shrink-0">
                          Invalidate:
                        </span>
                        <span className="text-foreground/80 font-mono">
                          {rule.invalidation}
                        </span>
                      </div>
                    )}
                    {rule.notes && (
                      <div className="text-foreground/40 italic">
                        Note: {rule.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
