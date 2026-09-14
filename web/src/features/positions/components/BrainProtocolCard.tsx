"use client";

import React from "react";
import { Shield } from "lucide-react";

export const BrainProtocolCard: React.FC = () => {
  return (
    <div className="mt-3 bg-surface border border-surface-border rounded-xl p-5 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-foreground/70" />
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
  );
};
