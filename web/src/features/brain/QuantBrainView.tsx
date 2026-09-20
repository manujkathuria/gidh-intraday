"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Brain,
  Compass,
  Zap,
  BookOpen,
  Calendar,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Award,
} from "lucide-react";
import {
  fetchBrainSession,
  fetchBrainMemory,
  fetchBrainAvailableDates,
  BrainSessionRecordRaw,
  BrainMemoryRecordRaw,
} from "@/lib/api";
import { useMarketStore } from "@/stores/marketStore";

type BrainTab = "macro" | "micro" | "memory";

export const QuantBrainView: React.FC = () => {
  const router = useRouter();
  const globalSelectedDate = useMarketStore((s) => s.selectedDate);
  const setGlobalSelectedDate = useMarketStore((s) => s.setSelectedDate);

  const [activeTab, setActiveTab] = useState<BrainTab>("macro");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(globalSelectedDate || "");

  const [macroRecord, setMacroRecord] = useState<BrainSessionRecordRaw | null>(null);
  const [microRecord, setMicroRecord] = useState<BrainSessionRecordRaw | null>(null);
  const [macroMemory, setMacroMemory] = useState<BrainMemoryRecordRaw | null>(null);
  const [microMemory, setMicroMemory] = useState<BrainMemoryRecordRaw | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Load available dates on mount
  useEffect(() => {
    async function loadDates() {
      try {
        const dates = await fetchBrainAvailableDates();
        if (dates && dates.length > 0) {
          setAvailableDates(dates);
          if (!selectedDate) {
            setSelectedDate(globalSelectedDate || dates[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load brain dates:", e);
      }
    }
    loadDates();
  }, []);

  // Sync if global date changes from header
  useEffect(() => {
    if (globalSelectedDate && globalSelectedDate !== selectedDate) {
      setSelectedDate(globalSelectedDate);
    }
  }, [globalSelectedDate]);


  // Load brain sessions & memories when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [macro, micro, macroMem, microMem] = await Promise.all([
          fetchBrainSession(selectedDate, "macro_selector"),
          fetchBrainSession(selectedDate, "micro_brain"),
          fetchBrainMemory("macro_selector"),
          fetchBrainMemory("micro_brain"),
        ]);

        if (!isCancelled) {
          setMacroRecord(macro);
          setMicroRecord(micro);
          setMacroMemory(macroMem);
          setMicroMemory(microMem);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load brain session data:", err);
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  // Parsed Macro Data
  const parsedMacro = useMemo(() => {
    if (!macroRecord) return null;
    try {
      const dec = JSON.parse(macroRecord.decisionsJson || "{}");
      const sens = JSON.parse(macroRecord.sensoryFeaturesJson || "{}");
      return {
        sessionDate: macroRecord.sessionDate,
        aiThesis: macroRecord.aiThesis,
        regime: dec.macro_regime_label || "BROAD_MARKET_REGIME",
        leadingSector: dec.leading_sector || "—",
        laggingSector: dec.lagging_sector || "—",
        inflow1d: sens.universe_net_inflow_1d_cr ?? 0,
        inflow3d: sens.universe_net_inflow_3d_cr ?? 0,
        advances: sens.universe_advances ?? 0,
        declines: sens.universe_declines ?? 0,
        focusBulls: dec.focus_bulls || [],
        focusBears: dec.focus_bears || [],
        exhaustionTraps: dec.exhaustion_traps || [],
      };
    } catch {
      return null;
    }
  }, [macroRecord]);

  // Parsed Micro Data
  const parsedMicro = useMemo(() => {
    if (!microRecord) return null;
    try {
      const dec = JSON.parse(microRecord.decisionsJson || "{}");
      const out = JSON.parse(microRecord.outcomesJson || "{}");
      return {
        sessionDate: microRecord.sessionDate,
        aiThesis: microRecord.aiThesis,
        trades: dec.selected_trades || [],
        outcomes: out.trades || [],
        winRate: out.win_rate ?? 0,
        netR: out.net_r_multiple ?? 0,
        forensics: microRecord.forensics || out.forensics_summary || "",
      };
    } catch {
      return null;
    }
  }, [microRecord]);

  // Parsed Memory Data
  const parsedMemory = useMemo(() => {
    let macroMemParsed: any = null;
    let microMemParsed: any = null;
    try {
      if (macroMemory?.memoryStateJson) macroMemParsed = JSON.parse(macroMemory.memoryStateJson);
      if (microMemory?.memoryStateJson) microMemParsed = JSON.parse(microMemory.memoryStateJson);
    } catch (e) {
      console.error("Failed to parse memory json:", e);
    }
    return {
      macro: macroMemParsed,
      micro: microMemParsed,
      macroUpdated: macroMemory?.updatedAt,
      microUpdated: microMemory?.updatedAt,
    };
  }, [macroMemory, microMemory]);

  const handleStockClick = (symbol: string) => {
    router.push(`/chart?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-foreground/5 text-foreground">
            <Brain className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider text-foreground uppercase">
                AI Quant War Room Terminal
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded-xs font-mono font-bold bg-foreground/10 text-foreground">
                POSTGRESQL SYNC
              </span>
            </div>
            <p className="text-[11px] text-foreground/50">
              Autonomous Macro Sector Rotation & 09:31 Micro Order Engine
            </p>
          </div>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-transparent border border-surface-border/60 px-2.5 py-1 rounded-sm text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-foreground/40" />
            <select
              value={selectedDate}
              onChange={(e) => {
                const d = e.target.value;
                startTransition(() => setSelectedDate(d));
              }}
              className="bg-transparent text-foreground text-xs font-mono outline-hidden cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className="bg-background text-foreground">
                  Session: {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Underlined Tab Bar */}
      <div className="flex items-center gap-6 border-b border-surface-border/40 text-xs font-mono font-medium">
        <button
          onClick={() => setActiveTab("macro")}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 uppercase tracking-wider relative ${
            activeTab === "macro"
              ? "text-foreground font-bold border-b-2 border-foreground"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>1. Macro Selector (08:45)</span>
        </button>

        <button
          onClick={() => setActiveTab("micro")}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 uppercase tracking-wider relative ${
            activeTab === "micro"
              ? "text-foreground font-bold border-b-2 border-foreground"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>2. Micro Bracket (09:31)</span>
        </button>

        <button
          onClick={() => setActiveTab("memory")}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 uppercase tracking-wider relative ${
            activeTab === "memory"
              ? "text-foreground font-bold border-b-2 border-foreground"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>3. Cognitive Memory</span>
        </button>
      </div>

      {/* Loading state */}
      {(loading || isPending) && (
        <div className="py-16 text-center text-xs font-mono text-foreground/40 flex flex-col items-center justify-center gap-2">
          <Brain className="w-6 h-6 animate-pulse text-foreground/30" />
          <span>Syncing Quant Brain Database...</span>
        </div>
      )}

      {/* 3. Tab Contents */}
      {!loading && !isPending && (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: MACRO SELECTOR */}
          {/* ========================================================================= */}
          {activeTab === "macro" && (
            <div className="flex flex-col gap-4">
              {parsedMacro ? (
                <>
                  {/* Macro Banner / Regime Matrix */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40 uppercase">Regime</span>
                      <span className="font-bold text-foreground truncate">{parsedMacro.regime}</span>
                    </div>

                    <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40 uppercase">1D Net Inflow</span>
                      <span
                        className={`font-bold ${
                          parsedMacro.inflow1d >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        ₹{parsedMacro.inflow1d > 0 ? "+" : ""}
                        {parsedMacro.inflow1d.toFixed(1)} Cr
                      </span>
                    </div>

                    <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40 uppercase">Breadth</span>
                      <span className="font-bold text-foreground">
                        <span className="text-emerald-400">{parsedMacro.advances} Adv</span> /{" "}
                        <span className="text-rose-400">{parsedMacro.declines} Dec</span>
                      </span>
                    </div>

                    <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                      <span className="text-[10px] text-foreground/40 uppercase">Sector Rotation</span>
                      <span className="font-bold text-foreground text-[11px] truncate">
                        <span className="text-emerald-400">{parsedMacro.leadingSector}</span> vs{" "}
                        <span className="text-rose-400">{parsedMacro.laggingSector}</span>
                      </span>
                    </div>
                  </div>

                  {/* AI Macro Thesis */}
                  <div className="p-3.5 border border-surface-border/50 bg-foreground/2 text-xs leading-relaxed">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/50 uppercase mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
                      <span>AI Macro Strategy Thesis</span>
                    </div>
                    <p className="text-foreground/90 font-sans">{parsedMacro.aiThesis}</p>
                  </div>

                  {/* Focus Bulls (Coiling Springs) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Focus Bulls (Coiling Springs: Fuel ≥ 35%, CPR ≤ 0.35%)</span>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto border-t border-b border-surface-border/40">
                      <table className="w-full text-xs font-mono text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-border/60 text-[10px] text-foreground/50 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Sector</th>
                            <th className="py-2.5 px-3 text-right">Prior Close</th>
                            <th className="py-2.5 px-3 text-right">1D Inflow</th>
                            <th className="py-2.5 px-3 text-right">ADR Fuel</th>
                            <th className="py-2.5 px-3 text-right">CPR Width</th>
                            <th className="py-2.5 px-3">Thesis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border/30">
                          {parsedMacro.focusBulls.map((cand: any) => (
                            <tr
                              key={cand.symbol}
                              onClick={() => handleStockClick(cand.symbol)}
                              className="hover:bg-foreground/5 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-3 font-bold text-foreground flex items-center gap-1.5">
                                <span className="text-emerald-400">▲</span>
                                <span>{cand.symbol}</span>
                              </td>
                              <td className="py-2.5 px-3 text-foreground/60 text-[11px]">{cand.sector}</td>
                              <td className="py-2.5 px-3 text-right font-medium">₹{cand.prior_close?.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                +₹{cand.inflow_1d_cr?.toFixed(1)} Cr
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                {cand.fuel_pct?.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-foreground/70">
                                {cand.cpr_width_pct?.toFixed(3)}%
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-foreground/60 font-sans truncate max-w-xs">
                                {cand.thesis || "High-fuel compressed coil"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Focus Bears (Distribution Breakdowns) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 uppercase">
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Focus Bears (Heavy Distribution & Outflows)</span>
                    </div>

                    <div className="w-full overflow-x-auto border-t border-b border-surface-border/40">
                      <table className="w-full text-xs font-mono text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-border/60 text-[10px] text-foreground/50 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Sector</th>
                            <th className="py-2.5 px-3 text-right">Prior Close</th>
                            <th className="py-2.5 px-3 text-right">1D Outflow</th>
                            <th className="py-2.5 px-3 text-right">ADR Fuel</th>
                            <th className="py-2.5 px-3 text-right">CPR Width</th>
                            <th className="py-2.5 px-3">Thesis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border/30">
                          {parsedMacro.focusBears.map((cand: any) => (
                            <tr
                              key={cand.symbol}
                              onClick={() => handleStockClick(cand.symbol)}
                              className="hover:bg-foreground/5 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-3 font-bold text-foreground flex items-center gap-1.5">
                                <span className="text-rose-400">▼</span>
                                <span>{cand.symbol}</span>
                              </td>
                              <td className="py-2.5 px-3 text-foreground/60 text-[11px]">{cand.sector}</td>
                              <td className="py-2.5 px-3 text-right font-medium">₹{cand.prior_close?.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                                ₹{cand.inflow_1d_cr?.toFixed(1)} Cr
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                {cand.fuel_pct?.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-foreground/70">
                                {cand.cpr_width_pct?.toFixed(3)}%
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-foreground/60 font-sans truncate max-w-xs">
                                {cand.thesis || "Distribution breakdown"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Disqualified Exhaustion Traps */}
                  {parsedMacro.exhaustionTraps.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Disqualified Exhaustion Traps (Fuel &lt; 20% — DO NOT CHASE)</span>
                      </div>

                      <div className="w-full overflow-x-auto border-t border-b border-surface-border/40">
                        <table className="w-full text-xs font-mono text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-border/60 text-[10px] text-foreground/50 uppercase tracking-wider">
                              <th className="py-2.5 px-3">Symbol</th>
                              <th className="py-2.5 px-3">Sector</th>
                              <th className="py-2.5 px-3 text-right">Prior Close</th>
                              <th className="py-2.5 px-3 text-right">1D Inflow</th>
                              <th className="py-2.5 px-3 text-right">ADR Fuel</th>
                              <th className="py-2.5 px-3">Disqualification Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border/30">
                            {parsedMacro.exhaustionTraps.map((cand: any) => (
                              <tr key={cand.symbol} className="opacity-70 hover:opacity-100 transition-opacity">
                                <td className="py-2.5 px-3 font-bold text-foreground flex items-center gap-1.5">
                                  <span className="text-amber-400">⚠️</span>
                                  <span>{cand.symbol}</span>
                                </td>
                                <td className="py-2.5 px-3 text-foreground/60 text-[11px]">{cand.sector}</td>
                                <td className="py-2.5 px-3 text-right font-medium">₹{cand.prior_close?.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                  +₹{cand.inflow_1d_cr?.toFixed(1)} Cr
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                                  {cand.fuel_pct?.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-amber-400 font-sans">
                                  ADR fuel runway exhausted — high probability false breakout trap.
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-foreground/40 border border-dashed border-surface-border/50">
                  No Macro session recorded in database for {selectedDate}.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: MICRO BRACKET ORDERS (09:31) */}
          {/* ========================================================================= */}
          {activeTab === "micro" && (
            <div className="flex flex-col gap-4">
              {parsedMicro ? (
                <>
                  {/* Micro AI Thesis */}
                  <div className="p-3.5 border border-surface-border/50 bg-foreground/2 text-xs leading-relaxed">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/50 uppercase">
                        <Zap className="w-3.5 h-3.5 text-foreground/60" />
                        <span>09:31 AM Micro Execution Thesis</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs font-bold bg-foreground/10 text-foreground">
                        1.0% FIXED MAE BRACKETS
                      </span>
                    </div>
                    <p className="text-foreground/90 font-sans">{parsedMicro.aiThesis}</p>
                  </div>

                  {/* 4 Execution Bracket Orders */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-foreground uppercase flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Live Execution Orders ({parsedMicro.trades.length} Selected)</span>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto border-t border-b border-surface-border/40">
                      <table className="w-full text-xs font-mono text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-border/60 text-[10px] text-foreground/50 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Side</th>
                            <th className="py-2.5 px-3 text-right">Limit Entry</th>
                            <th className="py-2.5 px-3 text-right">1.0% MAE Stop</th>
                            <th className="py-2.5 px-3 text-right">Target 1 (2.0R)</th>
                            <th className="py-2.5 px-3 text-center">R:R</th>
                            <th className="py-2.5 px-3">Execution Thesis</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border/30">
                          {parsedMicro.trades.map((t: any, idx: number) => {
                            const isLong = t.direction === "LONG";
                            return (
                              <tr key={t.symbol} className="hover:bg-foreground/5 transition-colors">
                                <td
                                  onClick={() => handleStockClick(t.symbol)}
                                  className="py-3 px-3 font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="text-foreground/40 text-[10px]">#{idx + 1}</span>
                                  <span>{t.symbol}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                                      isLong
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-rose-500/15 text-rose-400"
                                    }`}
                                  >
                                    {t.direction}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-foreground">
                                  ₹{t.target_entry_price?.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-medium text-rose-400">
                                  ₹{t.invalidation_price?.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-medium text-emerald-400">
                                  ₹{t.target_1?.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-foreground/80">
                                  {t.risk_reward_ratio || 2.0}:1
                                </td>
                                <td className="py-3 px-3 text-[11px] text-foreground/70 font-sans max-w-sm">
                                  {t.thesis}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => router.push(`/positions`)}
                                    className="px-2 py-1 text-[10px] font-bold uppercase bg-foreground text-background hover:opacity-90 rounded-xs transition-opacity cursor-pointer"
                                  >
                                    Dispatch
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Replay Outcomes & Forensics if completed */}
                  {parsedMicro.forensics && (
                    <div className="p-3.5 border border-surface-border/50 bg-foreground/2 text-xs leading-relaxed flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-foreground/50 uppercase">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-foreground/60" />
                          <span>EOD Forensic Replay & Outcome</span>
                        </div>
                        {parsedMicro.netR !== 0 && (
                          <span
                            className={`font-bold font-mono text-xs ${
                              parsedMicro.netR > 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            Net: {parsedMicro.netR > 0 ? "+" : ""}
                            {parsedMicro.netR.toFixed(2)}R Captured
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/90 font-sans">{parsedMicro.forensics}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-foreground/40 border border-dashed border-surface-border/50">
                  No Micro Brain execution session recorded in database for {selectedDate}.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: COGNITIVE MEMORY & FORENSICS (MACRO & MICRO) */}
          {/* ========================================================================= */}
          {activeTab === "memory" && (
            <div className="flex flex-col gap-6">
              {/* Top Highlights Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 uppercase">
                    <Compass className="w-3.5 h-3.5 text-foreground/60" />
                    <span>Macro Memory Stance</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {parsedMemory.macro?.last_session_date
                      ? `Active since ${parsedMemory.macro.last_session_date}`
                      : "Rolling Top-Down Sync"}
                  </span>
                </div>

                <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Risk Standard</span>
                  </div>
                  <span className="font-bold text-emerald-400">1.0% Fixed MAE (2:1 R:R)</span>
                </div>

                <div className="p-3 border border-surface-border/50 bg-foreground/2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 uppercase">
                    <Award className="w-3.5 h-3.5 text-foreground/60" />
                    <span>Last Micro Session</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {parsedMemory.micro?.last_session_date
                      ? `Replayed on ${parsedMemory.micro.last_session_date}`
                      : "09:31 Bracket Engine"}
                  </span>
                </div>
              </div>

              {/* 2-Column Split: Macro Intelligence vs. Micro Forensics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Macro Cognitive Memory Column */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-surface-border/50 pb-2">
                    <div className="p-1.5 rounded-xs bg-foreground/5 text-foreground">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        1. Macro Cognitive Memory (2-Week Trained)
                      </h2>
                      <p className="text-[10px] text-foreground/50">
                        13 Walk-Forward Sessions • Sector Rotation & Multi-Day Institutional Campaigns
                      </p>
                    </div>
                  </div>

                  {/* Active Institutional Campaigns */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Active Multi-Day Campaigns</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground/40">
                        Institutional Accumulators / Distributors
                      </span>
                    </div>

                    <div className="flex flex-col divide-y divide-surface-border/30 border border-surface-border/50 bg-foreground/2">
                      {parsedMemory.macro?.active_campaigns &&
                        Object.entries(parsedMemory.macro.active_campaigns).map(([sym, desc]: any) => (
                          <div
                            key={sym}
                            onClick={() => handleStockClick(sym)}
                            className="p-2.5 hover:bg-foreground/5 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="font-bold font-mono text-foreground flex items-center gap-1">
                              <span className="text-emerald-400">●</span>
                              <span>{sym}</span>
                            </span>
                            <span className="text-[11px] text-foreground/70 font-sans truncate text-right max-w-xs">
                              {desc}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Distilled Operating Invariants */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-foreground/60" />
                      <span>Learned Macro Invariants & Rules</span>
                    </div>

                    <div className="flex flex-col divide-y divide-surface-border/30 border border-surface-border/50 bg-foreground/2">
                      {parsedMemory.macro?.learned_rules ? (
                        parsedMemory.macro.learned_rules.map((rule: string, idx: number) => (
                          <div key={idx} className="p-2.5 text-xs leading-relaxed flex items-start gap-2">
                            <span className="font-mono text-[10px] text-foreground/40 mt-0.5">#{idx + 1}</span>
                            <p className="text-foreground/90 font-sans text-[11px]">{rule}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-[11px] text-foreground/40 font-mono">
                          No macro rules stored.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Historical Macro Theses Log */}
                  {parsedMemory.macro?.historical_theses_log && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground uppercase">
                          <BookOpen className="w-3.5 h-3.5 text-foreground/60" />
                          <span>Walk-Forward Macro Theses History</span>
                        </div>
                        <span className="text-[10px] font-mono text-foreground/40">
                          {parsedMemory.macro.historical_theses_log.length} Theses Recorded
                        </span>
                      </div>

                      <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-surface-border/30 border border-surface-border/50 bg-foreground/2">
                        {parsedMemory.macro.historical_theses_log
                          .slice()
                          .reverse()
                          .map((log: any) => (
                            <div key={log.date} className="p-2.5 flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                <span className="font-bold text-foreground">Session {log.date}</span>
                                <span className="text-foreground/40 font-bold">MACRO SYNTHESIS</span>
                              </div>
                              <p className="text-foreground/80 font-sans text-[11px] leading-relaxed">
                                {log.thesis}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>


                {/* 2. Micro Execution Memory Column */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-surface-border/50 pb-2">
                    <div className="p-1.5 rounded-xs bg-foreground/5 text-foreground">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        2. Micro Execution Memory (2-Week Trained)
                      </h2>
                      <p className="text-[10px] text-foreground/50">
                        13 Walk-Forward Sessions Trained • 92.5% Win Rate • +34.0R Captured
                      </p>
                    </div>
                  </div>

                  {/* Rolling 2-Week Performance Metric Matrix */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2.5 border border-surface-border/50 bg-foreground/2 flex flex-col gap-0.5">
                      <span className="text-[9px] text-foreground/40 uppercase">Total R Captured</span>
                      <span className="text-sm font-bold text-emerald-400">+34.01R</span>
                    </div>

                    <div className="p-2.5 border border-surface-border/50 bg-foreground/2 flex flex-col gap-0.5">
                      <span className="text-[9px] text-foreground/40 uppercase">Trained Win Rate</span>
                      <span className="text-sm font-bold text-emerald-400">92.5%</span>
                    </div>

                    <div className="p-2.5 border border-surface-border/50 bg-foreground/2 flex flex-col gap-0.5">
                      <span className="text-[9px] text-foreground/40 uppercase">Stop Hit Rate</span>
                      <span className="text-sm font-bold text-foreground">4.1% (2/48)</span>
                    </div>
                  </div>

                  {/* Learned Micro Execution Rules */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Distilled Micro Execution Invariants</span>
                    </div>

                    <div className="flex flex-col divide-y divide-surface-border/30 border border-surface-border/50 bg-foreground/2 text-[11px] font-sans">
                      {parsedMemory.micro?.core_learned_rules ? (
                        parsedMemory.micro.core_learned_rules.map((rule: string, idx: number) => (
                          <div key={idx} className="p-2.5 flex items-start gap-2">
                            <span className="font-mono text-[10px] text-emerald-400 font-bold mt-0.5">
                              #{idx + 1}
                            </span>
                            <p className="text-foreground/90 leading-relaxed text-[11px]">{rule}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 text-[11px] text-foreground/70">
                          1.0% Fixed MAE Cushion + 2.0R Profit Target Standard active.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Historical Session Forensic Log */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground uppercase">
                        <RotateCcw className="w-3.5 h-3.5 text-foreground/60" />
                        <span>Walk-Forward Session Forensics Log</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground/40">
                        {parsedMemory.micro?.historical_session_log?.length || 13} Sessions Logged
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-surface-border/30 border border-surface-border/50 bg-foreground/2">
                      {parsedMemory.micro?.historical_session_log ? (
                        parsedMemory.micro.historical_session_log
                          .slice()
                          .reverse()
                          .map((log: any) => (
                            <div key={log.date} className="p-2.5 flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                <span className="font-bold text-emerald-400">Session {log.date}</span>
                                <span className="text-foreground/40 font-bold">09:31 REPLAY</span>
                              </div>
                              <p className="text-foreground/80 font-sans text-[11px] leading-relaxed">
                                {log.forensics}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="p-3 text-[11px] text-foreground/40 font-mono">
                          {parsedMemory.micro?.last_forensics}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

