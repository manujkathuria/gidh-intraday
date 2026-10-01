"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  fetchMacroSymbols,
  fetchMacroDates,
  fetchMacroDaily,
  fetchMacroIntraday,
  MacroDailyCandle,
  MacroIntradayCandle,
  MacroLevelsData,
} from "@/lib/api_quant";
import { useMarketStore } from "@/stores/marketStore";
import { MacroChartCanvas } from "./components/MacroChartCanvas";
import { Loader2, Calendar, Clock, BarChart2, Layers, Search } from "lucide-react";

export const MacroDashboard: React.FC = () => {
  const storeSelectedDate = useMarketStore((s) => s.selectedDate);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("HEROMOTOCO");
  const [selectedDate, setSelectedDate] = useState<string>(storeSelectedDate || "");
  const [timeframeMode, setTimeframeMode] = useState<"INTRADAY" | "DAILY">("INTRADAY");
  const [lookbackSessions, setLookbackSessions] = useState<number>(120);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dailyCandles, setDailyCandles] = useState<MacroDailyCandle[]>([]);
  const [intradayCandles, setIntradayCandles] = useState<MacroIntradayCandle[]>([]);
  const [macroLevels, setMacroLevels] = useState<MacroLevelsData | null>(null);

  // 1. Initial Load of Universe Symbols and Dates
  useEffect(() => {
    async function loadMeta() {
      const [syms, dts] = await Promise.all([fetchMacroSymbols(), fetchMacroDates()]);
      if (syms.length > 0) setSymbols(syms);
      if (dts.length > 0) {
        setDates(dts);
        if (!selectedDate) setSelectedDate(dts[0]);
      }
    }
    loadMeta();
  }, []);

  // 2. Fetch Chart Data whenever Symbol, Date, or Mode changes
  useEffect(() => {
    if (!selectedSymbol || !selectedDate) return;
    let isCancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        if (timeframeMode === "INTRADAY") {
          const res = await fetchMacroIntraday(selectedSymbol, selectedDate);
          if (!isCancelled && res) {
            setIntradayCandles(res.candles);
            setMacroLevels(res.levels);
          }
        } else {
          const res = await fetchMacroDaily(selectedSymbol, selectedDate, lookbackSessions);
          if (!isCancelled) {
            setDailyCandles(res);
          }
        }
      } catch (err) {
        console.error("Error fetching macro data:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol, selectedDate, timeframeMode, lookbackSessions]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return symbols;
    return symbols.filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [symbols, searchTerm]);

  // Latest candle / bar info for metrics header
  const latestClose =
    timeframeMode === "INTRADAY" && intradayCandles.length > 0
      ? intradayCandles[intradayCandles.length - 1].close
      : dailyCandles.length > 0
      ? dailyCandles[dailyCandles.length - 1].close
      : 0;

  const latestOpen =
    timeframeMode === "INTRADAY" && intradayCandles.length > 0
      ? intradayCandles[0].open
      : dailyCandles.length > 0
      ? dailyCandles[dailyCandles.length - 1].open
      : 0;

  const dayChangePct =
    latestOpen > 0 ? ((latestClose - latestOpen) / latestOpen) * 100 : 0;

  return (
    <div className="flex-1 w-full flex flex-col gap-3 min-h-0 overflow-hidden pb-4">
      {/* 1. Control Header Bar */}
      <div className="bg-surface border border-surface-border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        {/* Left: Symbol Search, Date Selector & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Symbol Select / Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-foreground/40 pointer-events-none" />
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-md bg-surface-muted border border-surface-border font-extrabold text-foreground focus:outline-hidden focus:border-primary cursor-pointer transition text-xs appearance-none"
            >
              {symbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-foreground/40 pointer-events-none" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-md bg-surface-muted border border-surface-border font-bold text-foreground focus:outline-hidden focus:border-primary cursor-pointer transition text-xs appearance-none font-mono"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-surface-border hidden sm:block" />

          {/* Timeframe Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-md bg-surface-muted border border-surface-border">
            <button
              onClick={() => setTimeframeMode("INTRADAY")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                timeframeMode === "INTRADAY"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⚡ Intraday 1M</span>
            </button>
            <button
              onClick={() => setTimeframeMode("DAILY")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                timeframeMode === "DAILY"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>📊 Daily Macro</span>
            </button>
          </div>
        </div>

        {/* Right: Metrics & Lookback Slider */}
        <div className="flex items-center gap-3 tabular-nums">
          {timeframeMode === "DAILY" && (
            <div className="flex items-center gap-2 text-foreground/60">
              <span>Lookback:</span>
              <select
                value={lookbackSessions}
                onChange={(e) => setLookbackSessions(Number(e.target.value))}
                className="px-2 py-1 rounded bg-surface-muted border border-surface-border text-foreground font-bold cursor-pointer"
              >
                <option value={60}>60 Sessions</option>
                <option value={120}>120 Sessions</option>
                <option value={180}>180 Sessions</option>
              </select>
            </div>
          )}

          {latestClose > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-foreground">₹{latestClose.toFixed(2)}</span>
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded ${
                  dayChangePct >= 0
                    ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-rose-500 bg-rose-500/10 border border-rose-500/20"
                }`}
              >
                {dayChangePct >= 0 ? "+" : ""}
                {dayChangePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Structural Levels Strip (Intraday Mode) */}
      {timeframeMode === "INTRADAY" && macroLevels && (
        <div className="bg-surface/60 border border-surface-border rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="font-sans font-bold text-foreground/50 text-[10px] uppercase tracking-wider mr-1">
            Macro Levels:
          </span>
          {macroLevels.pwh && (
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
              PWH: ₹{macroLevels.pwh.toFixed(1)}
            </span>
          )}
          {macroLevels.pwl && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              PWL: ₹{macroLevels.pwl.toFixed(1)}
            </span>
          )}
          {macroLevels.pdh && (
            <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-semibold">
              PDH: ₹{macroLevels.pdh.toFixed(1)}
            </span>
          )}
          {macroLevels.pdl && (
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold">
              PDL: ₹{macroLevels.pdl.toFixed(1)}
            </span>
          )}
          {macroLevels.swing_res && (
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
              Swing RES: ₹{macroLevels.swing_res.toFixed(1)}
            </span>
          )}
          {macroLevels.swing_sup && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
              Swing SUP: ₹{macroLevels.swing_sup.toFixed(1)}
            </span>
          )}
          {macroLevels.clv_supply_zones && macroLevels.clv_supply_zones.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
              Supply Zone 1: ₹{macroLevels.clv_supply_zones[0].bottom.toFixed(1)} – ₹{macroLevels.clv_supply_zones[0].top.toFixed(1)}
            </span>
          )}
          {macroLevels.clv_demand_zones && macroLevels.clv_demand_zones.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              Demand Zone 1: ₹{macroLevels.clv_demand_zones[0].bottom.toFixed(1)} – ₹{macroLevels.clv_demand_zones[0].top.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* 3. High-Performance Macro Candlestick Chart */}
      <div className="flex-1 w-full bg-surface border border-surface-border rounded-lg p-2 flex flex-col min-h-0 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-surface/60 backdrop-blur-xs flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-mono text-foreground/70 bg-surface px-4 py-2 rounded border border-surface-border shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading {selectedSymbol} {timeframeMode === "INTRADAY" ? "1M & Macro Levels" : "Daily Structure"}...</span>
            </div>
          </div>
        )}

        <div className="flex-1 w-full h-full min-h-[500px]">
          <MacroChartCanvas
            mode={timeframeMode}
            dailyCandles={dailyCandles}
            intradayCandles={intradayCandles}
            macroLevels={macroLevels}
            symbol={selectedSymbol}
            isDark={true}
          />
        </div>
      </div>
    </div>
  );
};
