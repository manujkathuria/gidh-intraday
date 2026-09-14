"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { HeaderControls } from "@/components/HeaderControls";
import { useLiveOrderStore } from "@/stores/liveOrderStore";
import { useReplayStore } from "@/stores/replayStore";
import { ActivePosition, OrderIntent } from "@/lib/api";
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  XCircle,
  Plus,
  RefreshCw,
  LineChart,
  Activity,
  AlertTriangle,
  Lock,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function PositionsPage() {
  const {
    activePositions,
    isConnected,
    loading,
    initLiveOrders,
    placeTrade,
    squareOff,
  } = useLiveOrderStore();

  const { snapshot, init } = useReplayStore();

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [orderSide, setOrderSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderTactic, setOrderTactic] = useState("15M ORB BREAKOUT");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    init();
    initLiveOrders();
  }, [init, initLiveOrders]);

  const positionsList: ActivePosition[] = Object.values(activePositions);
  const totalSlots = 5;
  const usedSlots = positionsList.length;
  const availableSlots = Math.max(0, totalSlots - usedSlots);

  const totalPnLINR = positionsList.reduce((acc, p) => acc + p.pnl_inr, 0);
  const totalMarginUsed = usedSlots * 10000;
  const totalCapitalPool = 50000;
  const totalGrossExposure = totalMarginUsed * 5;

  const fnoStocks = snapshot?.stocks || [];

  const availableSymbols = useMemo(() => {
    return fnoStocks
      .filter((s) => !activePositions[s.symbol])
      .map((s) => ({
        symbol: s.symbol,
        price: s.price,
        move_pct: s.move_pct,
        rvol: s.rvol,
        sector: s.sector,
        is_above_vwap: s.is_above_vwap,
      }));
  }, [fnoStocks, activePositions]);

  const filteredSymbols = useMemo(() => {
    if (!searchFilter) return availableSymbols.slice(0, 30);
    const query = searchFilter.toLowerCase();
    return availableSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.sector.toLowerCase().includes(query)
    );
  }, [availableSymbols, searchFilter]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol) {
      alert("Please select a stock symbol.");
      return;
    }
    setSubmittingOrder(true);
    const intent: OrderIntent = {
      symbol: selectedSymbol,
      side: orderSide,
      margin_inr: 10000,
      tactic: orderTactic,
      invalidation: "15M_VWAP_CROSS",
    };

    const success = await placeTrade(intent);
    setSubmittingOrder(false);
    if (success) {
      setShowOrderModal(false);
      setSelectedSymbol("");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />

      <div className="w-full px-6 py-5 flex-1 flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Top War Room Hero Stats Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Metric 1: Total Real-Time P&L */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground/50 uppercase tracking-wider">
                Total Live P&L
              </span>
              <span
                className={`p-1.5 rounded-md ${
                  totalPnLINR >= 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {totalPnLINR >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span
                className={`text-2xl font-black tracking-tight ${
                  totalPnLINR >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {totalPnLINR >= 0 ? "+" : ""}₹{totalPnLINR.toFixed(2)}
              </span>
              <span className="text-xs text-foreground/50">
                (
                {usedSlots > 0
                  ? (
                      (totalPnLINR / (usedSlots * 10000)) *
                      100
                    ).toFixed(2)
                  : "0.00"}
                % on Margin)
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-foreground/50">
              <span>Real-Time MTM</span>
              <span className="font-bold text-foreground">
                {usedSlots} Active Positions
              </span>
            </div>
          </div>

          {/* Metric 2: Capital & Margin Pool */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground/50 uppercase tracking-wider">
                Margin Utilization
              </span>
              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground">
                {usedSlots} / 5 Slots
              </span>
            </div>

            <div className="mt-2 font-mono">
              <div className="text-2xl font-black text-foreground">
                ₹{totalMarginUsed.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-normal text-foreground/40">
                  / ₹{totalCapitalPool.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 pt-2 border-t border-surface-border flex flex-col gap-1">
              <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(usedSlots / 5) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-foreground/50">
                <span>₹10,000 / Slot</span>
                <span>{availableSlots} Available</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Leverage & Gross Power */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground/50 uppercase tracking-wider">
                Gross MIS Exposure
              </span>
              <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                5x LEVERAGE
              </span>
            </div>

            <div className="mt-2 font-mono">
              <div className="text-2xl font-black text-foreground">
                ₹{totalGrossExposure.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-normal text-foreground/40">
                  / ₹2,50,000 Max
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-foreground/50">
              <span>Risk Ceiling</span>
              <span className="font-bold text-rose-500">
                -₹750 SL (-1.5% stock)
              </span>
            </div>
          </div>

          {/* Metric 4: Live Execution & Broker Sync */}
          <div className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground/50 uppercase tracking-wider">
                Broker & Stream
              </span>
              <button
                onClick={() => initLiveOrders()}
                className="p-1 rounded hover:bg-surface-hover text-foreground/50 hover:text-foreground transition"
                title="Force Re-sync with Zerodha"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 font-mono">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isConnected ? "bg-emerald-400 opacity-75" : "bg-rose-400 opacity-75"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isConnected ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </span>
              <span className="text-base font-black text-foreground">
                {isConnected ? "ZERODHA CONNECTED" : "OFFLINE"}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-foreground/50">
              <span>Market Protection</span>
              <span className="font-bold text-foreground">-1 (Zero Collar)</span>
            </div>
          </div>
        </div>

        {/* Section Header & Order Action Button */}
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
              Active Trade Slots (5 Max)
            </h2>
          </div>

          <button
            onClick={() => setShowOrderModal(true)}
            disabled={availableSlots === 0}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-black flex items-center gap-1.5 transition ${
              availableSlots > 0
                ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm cursor-pointer"
                : "bg-surface-muted text-foreground/30 border border-surface-border cursor-not-allowed"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enter MIS Trade (₹10k Margin)</span>
          </button>
        </div>

        {/* 5 Fixed Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 font-mono">
          {Array.from({ length: 5 }).map((_, slotIndex) => {
            const pos = positionsList[slotIndex];

            if (pos) {
              const isLong = pos.side === "LONG";
              const isProfit = pos.pnl_inr >= 0;

              // Trailing Stop Badge logic
              let stopBadge = "SL -1.50% (HARD)";
              let stopBadgeColor =
                "text-foreground/60 border-surface-border bg-surface-muted";
              if (pos.stop_floor_pct >= 2.5) {
                stopBadge = "🔒 +2.50% PROFIT LOCKED";
                stopBadgeColor =
                  "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
              } else if (pos.stop_floor_pct >= 1.0) {
                stopBadge = "🔒 +1.00% PROFIT LOCKED";
                stopBadgeColor =
                  "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
              } else if (pos.stop_floor_pct >= 0.0) {
                stopBadge = "🛡️ 0.00% BREAKEVEN LOCKED";
                stopBadgeColor =
                  "text-amber-400 border-amber-500/40 bg-amber-500/10";
              }

              return (
                <div
                  key={pos.symbol}
                  className="bg-surface border-2 border-surface-border rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md relative overflow-hidden"
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/60">
                        Slot {slotIndex + 1}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          isLong
                            ? "bg-emerald-500 text-black"
                            : "bg-rose-500 text-black"
                        }`}
                      >
                        {pos.side}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Square off ${pos.symbol} at market immediately?`
                          )
                        ) {
                          squareOff(pos.symbol);
                        }
                      }}
                      title="Square off position unconditionally"
                      className="p-1 rounded text-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stock Symbol & Tactic */}
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">
                      {pos.symbol}
                    </h3>
                    <span className="text-[10px] text-foreground/50">
                      {pos.tactic || "15M VWAP PLAY"}
                    </span>
                  </div>

                  {/* Pricing Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-foreground/60 text-[11px]">
                      <span>Quantity:</span>
                      <span className="font-bold text-foreground">
                        {pos.quantity} Qty
                      </span>
                    </div>
                    <div className="flex justify-between text-foreground/60 text-[11px]">
                      <span>Avg Entry:</span>
                      <span className="font-bold text-foreground">
                        ₹{pos.entry_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-foreground/60 text-[11px]">
                      <span>Live LTP:</span>
                      <span className="font-black text-foreground">
                        ₹{pos.current_ltp.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* P&L Block */}
                  <div className="pt-2 border-t border-surface-border flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-foreground/50 uppercase font-bold">
                        P&L
                      </span>
                      <div
                        className={`text-sm font-black ${
                          isProfit ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {isProfit ? "+" : ""}₹{pos.pnl_inr.toFixed(2)} (
                        {isProfit ? "+" : ""}
                        {pos.pnl_pct.toFixed(2)}%)
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-foreground/50">
                      <span>MFE Peak:</span>
                      <span className="font-bold text-foreground">
                        +{pos.mfe_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Trailing Stop Badge */}
                  <div
                    className={`text-[9px] text-center font-bold px-2 py-1 rounded border ${stopBadgeColor}`}
                  >
                    {stopBadge}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(pos.symbol)}`}
                      className="text-[11px] text-foreground/70 hover:text-foreground flex items-center gap-1 font-bold transition"
                    >
                      <LineChart className="w-3.5 h-3.5" />
                      <span>Chart</span>
                    </Link>

                    <button
                      onClick={() => squareOff(pos.symbol)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition"
                    >
                      Square Off
                    </button>
                  </div>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-slot-${slotIndex}`}
                className="border-2 border-dashed border-surface-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[300px] hover:border-surface-border/80 transition"
              >
                <div className="p-3 rounded-full bg-surface-muted text-foreground/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-foreground/60">
                    Slot {slotIndex + 1} Empty
                  </h4>
                  <p className="text-[11px] text-foreground/40 mt-0.5">
                    ₹10,000 Margin Available
                  </p>
                </div>

                <button
                  onClick={() => setShowOrderModal(true)}
                  className="px-3 py-1.5 rounded-md bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Enter Trade</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Brain Risk Rules & Execution Guidelines */}
        <div className="mt-3 bg-surface border border-surface-border rounded-xl p-5 font-mono text-xs">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Live Operating Brain Execution & Exit Protocol
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-foreground/70 text-[11px] leading-relaxed">
            <div className="p-3 bg-surface-muted/50 rounded-lg border border-surface-border">
              <span className="font-bold text-foreground block mb-1">
                1. Fixed Margin Geometry
              </span>
              ₹50,000 pool split strictly into 5 slots × ₹10,000 margin. With 5x
              MIS leverage, each position controls ₹50,000 in gross equity.
            </div>

            <div className="p-3 bg-surface-muted/50 rounded-lg border border-surface-border">
              <span className="font-bold text-foreground block mb-1">
                2. Hard Initial Stop Loss
              </span>
              Immediate hard exit at -1.50% price drop from average fill (-₹750
              max loss per slot). No price collar delay.
            </div>

            <div className="p-3 bg-surface-muted/50 rounded-lg border border-surface-border">
              <span className="font-bold text-foreground block mb-1">
                3. Milestone Trailing Ratchets
              </span>
              +1.50% MFE moves floor to Breakeven (0.00%). +2.00% locks +1.00%
              profit. +3.50% locks +2.50% profit.
            </div>

            <div className="p-3 bg-surface-muted/50 rounded-lg border border-surface-border">
              <span className="font-bold text-foreground block mb-1">
                4. Mandatory EOD Square-Off
              </span>
              All active intraday MIS positions are unconditionally squared off
              at 15:15 IST before broker penalties.
            </div>
          </div>
        </div>
      </div>

      {/* Quick Order Dispatch Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl font-mono flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Dispatch Live MIS Order (₹10k Slot)
                </h3>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-foreground/40 hover:text-foreground"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex flex-col gap-4 text-xs">
              {/* Direction Selector: LONG vs SHORT */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-foreground/60 uppercase">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSide("LONG")}
                    className={`py-2 rounded-lg font-black transition border ${
                      orderSide === "LONG"
                        ? "bg-emerald-500 text-black border-emerald-500 shadow-sm"
                        : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    LONG (BUY)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide("SHORT")}
                    className={`py-2 rounded-lg font-black transition border ${
                      orderSide === "SHORT"
                        ? "bg-rose-500 text-black border-rose-500 shadow-sm"
                        : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    SHORT (SELL)
                  </button>
                </div>
              </div>

              {/* Symbol Search & Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-foreground/60 uppercase">
                  Select Stock from 210 F&O Universe
                </label>
                <input
                  type="text"
                  placeholder="Type to filter stock (e.g. RELIANCE, TATASTEEL)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-surface-muted border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-foreground/50"
                />

                <div className="max-h-40 overflow-y-auto border border-surface-border rounded-lg bg-surface-muted divide-y divide-surface-border custom-scrollbar mt-1">
                  {filteredSymbols.map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(item.symbol);
                        setSearchFilter(item.symbol);
                      }}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition ${
                        selectedSymbol === item.symbol
                          ? "bg-foreground text-background font-black"
                          : "hover:bg-surface-hover text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.symbol}</span>
                        <span className="text-[10px] text-foreground/50">
                          {item.sector}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span>₹{item.price.toFixed(2)}</span>
                        <span
                          className={
                            item.move_pct >= 0
                              ? "text-emerald-500 font-bold"
                              : "text-rose-500 font-bold"
                          }
                        >
                          {item.move_pct >= 0 ? "+" : ""}
                          {item.move_pct.toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactic / Setup */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-foreground/60 uppercase">
                  Brain Strategy / Tactic
                </label>
                <select
                  value={orderTactic}
                  onChange={(e) => setOrderTactic(e.target.value)}
                  className="bg-surface-muted border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="15M ORB BREAKOUT">15M Opening Range Breakout</option>
                  <option value="VWAP PULLBACK">VWAP Pullback / Bounce</option>
                  <option value="VWAP FADE">VWAP Mean Reversion Fade</option>
                  <option value="DAY HIGH BREAKOUT">Day High Volume Surge</option>
                  <option value="SECTOR MOMENTUM">Sector Momentum Leader</option>
                </select>
              </div>

              {/* Order Parameters Summary Box */}
              <div className="p-3 bg-surface-muted border border-surface-border rounded-lg flex flex-col gap-1 text-[11px] text-foreground/70">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-bold text-foreground">MIS (Intraday)</span>
                </div>
                <div className="flex justify-between">
                  <span>Slot Margin:</span>
                  <span className="font-bold text-foreground">₹10,000 (5x = ₹50,000 Gross)</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution Type:</span>
                  <span className="font-bold text-foreground">MARKET (market_protection: -1)</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Risk:</span>
                  <span className="font-bold text-rose-500">-1.50% (-₹750 SL Floor)</span>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-muted hover:bg-surface-hover text-foreground font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSymbol || submittingOrder}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingOrder ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Submitting to Zerodha...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Dispatch Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
