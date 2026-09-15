"use client";

import React from "react";
import { ChartInterval } from "./candleAggregator";

interface Props {
  interval: ChartInterval;
  onChangeInterval: (val: ChartInterval) => void;
  mode?: "LIVE" | "REPLAY";
}

const LIVE_INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "1d", value: "1d" },
];

const REPLAY_INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
];

export const ChartIntervalSelector: React.FC<Props> = ({
  interval,
  onChangeInterval,
  mode = "LIVE",
}) => {
  const intervals = mode === "REPLAY" ? REPLAY_INTERVALS : LIVE_INTERVALS;
  return (
    <div className="flex items-center bg-surface-muted/60 border border-surface-border rounded-md p-0.5 select-none shrink-0">
      {intervals.map((item) => {
        const isActive = item.value === interval;
        return (
          <button
            key={item.value}
            onClick={() => onChangeInterval(item.value)}
            className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer ${
              isActive
                ? "bg-foreground text-background shadow-xs font-black"
                : "text-foreground/50 hover:text-foreground hover:bg-surface-hover/50"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
