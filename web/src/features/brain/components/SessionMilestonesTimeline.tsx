"use client";

import React from "react";
import { Clock } from "lucide-react";

export const SessionMilestonesTimeline: React.FC = () => {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-surface-border pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-foreground/70" />
          <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
            Daily Operating Time Protocol & Session Milestones
          </h2>
        </div>
        <span className="text-[11px] text-foreground/50">
          IST (Indian Standard Time)
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">08:45 AM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            Pre-Open Wakeup & Daily CPR/ADR Calculation
          </span>
        </div>

        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">09:07 AM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            Pre-Open Discovery & Gap Rankings
          </span>
        </div>

        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">09:30 AM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            15M Bar 1 Close: Slots 1-3 Deployment
          </span>
        </div>

        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">09:45 AM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            Slots 4-5 Squeeze & Trap Short Deployment
          </span>
        </div>

        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">11:30 AM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            Mandatory Split-Exit (Cut Tier 3 runners)
          </span>
        </div>

        <div className="p-2.5 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
          <span className="font-bold text-foreground">15:15 PM</span>
          <span className="text-[10px] text-foreground/60 leading-tight">
            Mandatory MIS Intraday Square-Off
          </span>
        </div>
      </div>
    </div>
  );
};
