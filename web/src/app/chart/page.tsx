"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReplayStore, formatMinutesToTime } from "@/stores/replayStore";
import { HeaderControls } from "@/components/HeaderControls";
import { AdvancedCandlestickChart } from "@/components/AdvancedCandlestickChart";
import { fetchReplayCandles, Candle } from "@/lib/api";
import {
  Search,
  Activity,
  Layers,
} from "lucide-react";

function ChartContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const {
    selectedDate,
    currentTimeMinutes,
    snapshot,
    selectedSymbol,
    setSelectedSymbol,
    init,
  } = useReplayStore();

  const [activeSymbol, setActiveSymbol] = useState<string>(
    urlSymbol || selectedSymbol || "RELIANCE"
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    init();
  }, [init]);

  // Sync theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains("dark");
      setTheme(darkNow ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Update activeSymbol when url param changes
  useEffect(() => {
    if (urlSymbol && urlSymbol !== activeSymbol) {
      setActiveSymbol(urlSymbol);
      setSelectedSymbol(urlSymbol);
    }
  }, [urlSymbol, activeSymbol, setSelectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSelectedSymbol(sym);
    router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
  };

  // Fetch candles on time/date/symbol change
  useEffect(() => {
    if (!selectedDate || !activeSymbol) return;

    let isSubscribed = true;
    const toTimeStr = formatMinutesToTime(currentTimeMinutes);

    setLoadingCandles(true);
    fetchReplayCandles(selectedDate, activeSymbol, toTimeStr)
      .then((data) => {
        if (isSubscribed) {
          setChartCandles(data);
          setLoadingCandles(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching candles:", err);
        if (isSubscribed) setLoadingCandles(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedDate, activeSymbol, currentTimeMinutes]);

  const stockInfo = useMemo(() => {
    return snapshot?.stocks?.find((s) => s.symbol === activeSymbol);
  }, [snapshot, activeSymbol]);

  const allSymbols = useMemo(() => {
    if (!snapshot?.stocks) return [];
    return snapshot.stocks.map((s) => ({
      symbol: s.symbol,
      sector: s.sector,
      move_pct: s.move_pct,
      price: s.price,
      rvol: s.rvol,
      clv: s.clv,
    }));
  }, [snapshot]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return allSymbols;
    const lower = searchTerm.toLowerCase();
    return allSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(lower) ||
        s.sector.toLowerCase().includes(lower)
    );
  }, [allSymbols, searchTerm]);

  const price = stockInfo?.price || (chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].close : 0);
  const movePct = stockInfo?.move_pct || 0;
  const vwap = stockInfo?.vwap || (chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].vwap : 0);
  const rvol = stockInfo?.rvol || 0;
  const clv = stockInfo?.clv || 0;
  const isAboveVwap = stockInfo?.is_above_vwap ?? (price >= vwap);

  return (
    <div className="flex-1 w-full px-5 py-3 flex gap-4 overflow-hidden">
      {/* Left Sidebar: Quick Stock Selector */}
      <div className="w-80 bg-surface border border-surface-border rounded-lg flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-surface-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-foreground/70 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> F&O Universe ({allSymbols.length})
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-foreground/60 border border-surface-border">
              {selectedDate || "LIVE"}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              type="text"
              placeholder="Search stock or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-muted border border-surface-border rounded pl-8 pr-2.5 py-1 text-xs text-foreground placeholder-foreground/40 focus:outline-none focus:border-foreground/40 font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-surface-border font-mono text-xs">
          {filteredSymbols.length === 0 ? (
            <div className="p-6 text-center text-foreground/40 text-xs">
              No stocks found
            </div>
          ) : (
            filteredSymbols.map((item) => {
              const isSelected = item.symbol === activeSymbol;
              const isPositive = item.move_pct >= 0;

              return (
                <button
                  key={item.symbol}
                  onClick={() => handleSelectSymbol(item.symbol)}
                  className={`w-full p-2.5 text-left transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-foreground text-background font-bold shadow-sm"
                      : "hover:bg-surface-hover text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tracking-tight">
                        {item.symbol}
                      </span>
                      {item.rvol >= 4.0 && (
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                            isSelected
                              ? "bg-background text-foreground"
                              : "bg-foreground text-background"
                          }`}
                        >
                          RVOL
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] ${
                        isSelected ? "text-background/70" : "text-foreground/40"
                      }`}
                    >
                      {item.sector}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-semibold">₹{item.price.toFixed(2)}</span>
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected
                          ? "text-background"
                          : isPositive
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {item.move_pct.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Panel: Stock Summary Bar & Candlestick Chart */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Stock Header Metric Card */}
        <div className="bg-surface border border-surface-border rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 select-none">
          {/* Symbol & Sector Info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-foreground">
                  {activeSymbol}
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
                  {stockInfo?.sector || "EQUITY"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-foreground/50 mt-0.5">
                <span>As of {formatMinutesToTime(currentTimeMinutes).slice(0, 5)} IST</span>
                <span>•</span>
                <span>{chartCandles.length} 1m Bars Loaded</span>
              </div>
            </div>
          </div>

          {/* Live Metrics Matrix */}
          <div className="flex items-center gap-4 font-mono text-xs">
            {/* Last Price */}
            <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
              <span className="text-[10px] text-foreground/40 font-bold">LTP</span>
              <span className="text-sm font-black text-foreground">
                ₹{price.toFixed(2)}
              </span>
            </div>

            {/* Move % */}
            <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
              <span className="text-[10px] text-foreground/40 font-bold">CHANGE</span>
              <span
                className={`text-sm font-black flex items-center gap-0.5 ${
                  movePct >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {movePct >= 0 ? "+" : ""}
                {movePct.toFixed(2)}%
              </span>
            </div>

            {/* VWAP & Status */}
            <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
              <span className="text-[10px] text-foreground/40 font-bold">VWAP</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-amber-500">
                  ₹{vwap.toFixed(2)}
                </span>
                <span
                  className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                    isAboveVwap
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                  }`}
                >
                  {isAboveVwap ? "BULL" : "BEAR"}
                </span>
              </div>
            </div>

            {/* RVOL & Pace */}
            <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
              <span className="text-[10px] text-foreground/40 font-bold">RVOL PACE</span>
              <span className="text-sm font-black text-foreground">
                {rvol.toFixed(2)}x
              </span>
            </div>

            {/* CLV */}
            <div className="flex flex-col items-end px-3 py-1 bg-surface-muted border border-surface-border rounded">
              <span className="text-[10px] text-foreground/40 font-bold">CLV (HIGH-LOW)</span>
              <span className="text-sm font-black text-foreground">
                {clv.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Candlestick & Volume Chart Studio */}
        <div className="flex-1 bg-surface border border-surface-border rounded-lg p-2 flex flex-col min-h-[580px] relative">
          {loadingCandles && (
            <div className="absolute top-4 right-4 z-20 bg-surface/90 border border-surface-border px-3 py-1.5 rounded text-xs font-mono text-foreground/70 flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <Activity className="w-3.5 h-3.5 animate-spin text-foreground" />
              Syncing 1m stream...
            </div>
          )}

          <AdvancedCandlestickChart
            candles={chartCandles}
            symbol={activeSymbol}
            theme={theme}
            height={580}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />
      <Suspense fallback={<div className="p-8 font-mono text-xs text-foreground/40">Loading Chart Studio...</div>}>
        <ChartContent />
      </Suspense>
    </main>
  );
}
