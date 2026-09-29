"use client";

import React from "react";
import { TrendingUp, TrendingDown, Activity, Globe, Zap, Compass } from "lucide-react";
import { GiftNiftyInfo, VixInfo, IndexItem } from "@/lib/types_market";

interface Props {
  giftNifty?: GiftNiftyInfo;
  indiaVix?: VixInfo;
  nifty50?: IndexItem;
  niftyBank?: IndexItem;
}

export const IndicesOverviewCards: React.FC<Props> = ({
  giftNifty,
  indiaVix,
  nifty50,
  niftyBank,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs select-none">
      {/* 1. GIFT NIFTY GAP RADAR */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground/60 font-semibold">
            <Globe className="w-3.5 h-3.5 text-foreground/70" />
            <span>GIFT NIFTY</span>
          </div>
          {giftNifty && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold border tracking-wider ${
                giftNifty.sentiment === "BULLISH_GAP"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : giftNifty.sentiment === "BEARISH_GAP"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : "bg-surface-muted text-foreground/60 border-surface-border"
              }`}
            >
              {giftNifty.sentiment.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black font-mono text-foreground tracking-tight">
            {giftNifty ? giftNifty.price.toLocaleString("en-IN") : "25,840.0"}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              (giftNifty?.gap_pts || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {(giftNifty?.gap_pts || 0) >= 0 ? "+" : ""}
            {giftNifty?.gap_pts.toFixed(1)} pts ({giftNifty?.gap_pct.toFixed(2)}%)
          </span>
        </div>

        <div className="text-[10px] text-foreground/45 flex items-center justify-between pt-1 border-t border-surface-border/50">
          <span>Nifty Prev: ₹{giftNifty?.nifty_prev_close.toLocaleString("en-IN") || "-"}</span>
          <span className="font-semibold text-foreground/60">Pre-Market Cue</span>
        </div>
      </div>

      {/* 2. NIFTY 50 BENCHMARK */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground/60 font-semibold">
            <Zap className="w-3.5 h-3.5 text-foreground/70" />
            <span>NIFTY 50</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-surface-muted text-foreground/70 border border-surface-border">
            SPOT
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black font-mono text-foreground tracking-tight">
            {nifty50 ? nifty50.spot_price.toLocaleString("en-IN") : "25,800.0"}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              (nifty50?.change_pct || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {(nifty50?.change_pct || 0) >= 0 ? "+" : ""}
            {nifty50?.change_pts.toFixed(1)} ({(nifty50?.change_pct || 0).toFixed(2)}%)
          </span>
        </div>

        <div className="text-[10px] text-foreground/45 flex items-center justify-between pt-1 border-t border-surface-border/50">
          <span>VWAP: ₹{nifty50?.vwap?.toLocaleString("en-IN") || "-"}</span>
          <span>Adv/Dec: {nifty50?.advances || 0}/{nifty50?.declines || 0}</span>
        </div>
      </div>

      {/* 3. NIFTY BANK */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground/60 font-semibold">
            <Compass className="w-3.5 h-3.5 text-foreground/70" />
            <span>NIFTY BANK</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-surface-muted text-foreground/70 border border-surface-border">
            HIGH-BETA
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black font-mono text-foreground tracking-tight">
            {niftyBank ? niftyBank.spot_price.toLocaleString("en-IN") : "53,820.0"}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              (niftyBank?.change_pct || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {(niftyBank?.change_pct || 0) >= 0 ? "+" : ""}
            {niftyBank?.change_pts.toFixed(1)} ({(niftyBank?.change_pct || 0).toFixed(2)}%)
          </span>
        </div>

        <div className="text-[10px] text-foreground/45 flex items-center justify-between pt-1 border-t border-surface-border/50">
          <span>VWAP: ₹{niftyBank?.vwap?.toLocaleString("en-IN") || "-"}</span>
          <span>Adv/Dec: {niftyBank?.advances || 0}/{niftyBank?.declines || 0}</span>
        </div>
      </div>

      {/* 4. INDIA VIX SENSOR */}
      <div className="p-3 rounded-lg bg-surface border border-surface-border flex flex-col justify-between gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-foreground/60 font-semibold">
            <Activity className="w-3.5 h-3.5 text-foreground/70" />
            <span>INDIA VIX</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold border border-surface-border bg-surface-muted text-foreground tracking-wider">
            {indiaVix?.regime || "TRENDING"}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black font-mono text-foreground tracking-tight">
            {indiaVix ? indiaVix.value.toFixed(2) : "13.45"}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              (indiaVix?.change_pct || 0) >= 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {(indiaVix?.change_pct || 0) >= 0 ? "+" : ""}
            {indiaVix?.change_pct.toFixed(2)}%
          </span>
        </div>

        <div className="text-[10px] text-foreground/45 flex items-center justify-between pt-1 border-t border-surface-border/50">
          <span>Volatility Index</span>
          <span className="text-foreground/70 font-semibold">Ideal Trend Regime</span>
        </div>
      </div>
    </div>
  );
};
