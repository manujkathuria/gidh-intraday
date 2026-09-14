"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Shield, CandlestickChart, Brain, Zap } from "lucide-react";

interface Props {
  activeCount: number;
}

export const BrandNavigation: React.FC<Props> = ({ activeCount }) => {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black tracking-widest text-foreground">
          GIDH
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-foreground/70 border border-surface-border font-bold">
          WAR ROOM
        </span>
      </div>

      <div className="h-4 w-px bg-surface-border" />

      <nav className="flex items-center gap-1 font-mono text-xs">
        <Link
          href="/"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Radar</span>
        </Link>

        <Link
          href="/sectors"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/sectors"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Sectors</span>
        </Link>

        <Link
          href="/chart"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/chart"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <CandlestickChart className="w-3.5 h-3.5" />
          <span>Charts</span>
        </Link>

        <Link
          href="/brain"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/brain"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Quant Brain</span>
        </Link>

        <Link
          href="/positions"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/positions"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Positions</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              pathname === "/positions"
                ? "bg-background text-foreground border-background"
                : "bg-surface border-surface-border text-foreground/70"
            }`}
          >
            {activeCount}/5
          </span>
        </Link>
      </nav>
    </div>
  );
};
