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

      <span className="font-bold text-foreground/90 tracking-wider text-xs md:text-sm tabular-nums select-none">
        {liveClock || "09:15:00"} IST
      </span>
    </div>
  );
};
