"use client";

import React from "react";
import Link from "next/link";
import { useMarketStore } from "@/stores/marketStore";
import { ThemeToggle } from "./ThemeToggle";
import { UserAuthButton } from "./UserAuthButton";
import { BookOpen } from "lucide-react";

interface Props {
  isDark: boolean;
  toggleTheme: () => void;
  breadth?: number;
}

export const AppFooter: React.FC<Props> = ({
  isDark,
  toggleTheme,
  breadth = 0,
}) => {
  const { wsConnected, isLive } = useMarketStore();
  const isStreaming = wsConnected && isLive;
  const statusLabel = isStreaming ? "LIVE" : "SYNCED";
  const isBullish = breadth >= 50;

  return (
    <footer className="h-7 shrink-0 bg-surface/80 backdrop-blur-xs border-t border-surface-border flex items-center justify-between px-3 md:px-4 text-[11px] text-foreground/60 select-none z-20">
      {/* Left: Engine Status & Global VWAP Breadth */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Edge Engine Connection Status */}
        <div className="flex items-center gap-1.5 shrink-0" title={`Gidh Edge Engine: ${statusLabel}`}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isStreaming ? "bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" : "bg-foreground/30"
            }`}
          />
          <span className="font-semibold text-foreground/70 text-[10px] uppercase tracking-wider">
            {statusLabel}
          </span>
        </div>

        <div className="h-3 w-px bg-surface-border shrink-0" />

        {/* VWAP Breadth */}
        <div
          className="flex items-center gap-1.5 shrink-0 font-medium"
          title={`Market Breadth (Universe > VWAP): ${breadth.toFixed(0)}% (${isBullish ? "BULLISH" : "BEARISH"})`}
        >
          <span className="text-[10px] text-foreground/45 uppercase tracking-wider">VWAP</span>
          <span className={`font-bold tabular-nums text-[10px] ${isBullish ? "text-emerald-500" : "text-rose-500"}`}>
            {breadth.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Right: Docs Link + Theme Toggle + User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/docs"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-surface-hover text-foreground/70 hover:text-foreground font-medium text-[10px] transition cursor-pointer"
          title="System Architecture & Documentation"
        >
          <BookOpen className="w-3 h-3 text-foreground/60" />
          <span>Docs</span>
        </Link>

        <div className="h-3 w-px bg-surface-border mx-0.5" />

        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        <div className="h-3 w-px bg-surface-border mx-0.5" />
        <UserAuthButton />
      </div>
    </footer>
  );
};
