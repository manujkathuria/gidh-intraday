"use client";

import React from "react";
import { Clock } from "lucide-react";

interface Props {
  liveClock: string;
}

export const LiveStreamBar: React.FC<Props> = ({ liveClock }) => {
  return (
    <div className="flex items-center justify-between w-full text-xs">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
        </span>
        <span className="font-black text-foreground tracking-wide text-xs">LIVE STREAM</span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-muted border border-surface-border rounded">
        <Clock className="w-3 h-3 text-foreground/50" />
        <span className="font-bold text-foreground tracking-wider">
          {liveClock || "09:15:00"} IST
        </span>
      </div>
    </div>
  );
};
