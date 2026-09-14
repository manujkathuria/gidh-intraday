"use client";

import React from "react";
import { Brain } from "lucide-react";

export const BrainHeroMatrix: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
  );
};
