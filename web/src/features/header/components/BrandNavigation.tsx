"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, Layers, LineChart, Brain, Briefcase } from "lucide-react";

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
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-foreground/70 border border-surface-border font-bold">
          WAR ROOM
        </span>
      </div>

      <div className="h-4 w-px bg-surface-border" />

      <nav className="flex items-center gap-1 text-xs">
        <Link
          href="/"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
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
          <Layers className="w-3.5 h-3.5" />
          <span>Sectors</span>
        </Link>

        <Link
          href="/indices"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/indices"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <span className="font-mono text-xs font-black">#</span>
          <span>Indices</span>
        </Link>

        <Link
          href="/chart"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/chart"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Charts</span>
        </Link>

        <Link
          href="/futures"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/futures"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Futures</span>
        </Link>

        <Link
          href="/positions"
          className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${
            pathname === "/positions"
              ? "bg-foreground text-background font-bold border-foreground shadow-sm"
              : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Positions</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded border ${
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
