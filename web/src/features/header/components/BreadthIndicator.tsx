"use client";

import React from "react";
import { Activity } from "lucide-react";

interface Props {
  breadth: number;
}

export const BreadthIndicator: React.FC<Props> = ({ breadth }) => {
  const isBullish = breadth >= 50;

  return (
    <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2.5 py-1 text-xs font-mono">
      <Activity className="w-3.5 h-3.5 text-foreground/50" />
      <span className="text-foreground/50">VWAP:</span>
      <span className="font-bold text-foreground">
        {breadth.toFixed(0)}%
      </span>
      <span className="text-[10px] text-foreground/50">
        ({isBullish ? "BULL" : "BEAR"})
      </span>
    </div>
  );
};
