"use client";

import React from "react";
import { Clock } from "lucide-react";

interface Props {
  liveClock: string;
}

export const LiveStreamBar: React.FC<Props> = ({ liveClock }) => {
  return (
    <div className="px-5 py-1.5 bg-surface-muted/20 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
          </span>
          <span className="font-bold text-foreground">LIVE STREAM ACTIVE</span>
        </div>
        <span className="text-foreground/30">•</span>
        <span className="text-foreground/50">210 F&O Universe 1-Min Batch Poller</span>
        <span className="text-foreground/30">•</span>
        <span className="text-foreground/50">5-Slot MIS Live Order Manager</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-surface border border-surface-border rounded">
          <Clock className="w-3 h-3 text-foreground/60" />
          <span className="font-bold text-foreground">{liveClock || "09:15:00"} IST</span>
        </div>
      </div>
    </div>
  );
};
