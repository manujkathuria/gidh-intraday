"use client";

import React from "react";
import { Clock } from "lucide-react";

const MILESTONES = [
  { time: "08:45 AM", title: "Pre-Market Warmup", desc: "Token auth & 210 universe discovery" },
  { time: "09:15 AM", title: "Open Observation", desc: "Chill Guy Rule: Zero entries in first 15m" },
  { time: "09:30 AM", title: "Bar 1 Close (Entries)", desc: "Screen RVOL ≥ 5x Volume Leaders" },
  { time: "09:45 AM", title: "Bar 2 Close (Traps)", desc: "Catch false breakout traps & fill 5 slots" },
  { time: "11:30 AM", title: "Scout Split-Exit", desc: "Cut stagnant Tier 3 & BE ratchet (+1.5%)" },
  { time: "14:30 PM", title: "Scout Power Hour", desc: "Trail winning runner stops into close" },
  { time: "15:15 PM", title: "MIS Square-Off", desc: "Unconditional intraday exit before 15:20" },
];

export const SessionMilestonesTimeline: React.FC = () => {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-3 text-xs shadow-xs select-none">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-foreground/70" />
          <h2 className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Daily Operating Schedule & Checkpoint Protocol
          </h2>
        </div>
        <span className="text-[10px] text-foreground/40 font-medium">
          Indian Standard Time (IST)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {MILESTONES.map((m, idx) => (
          <div
            key={idx}
            className="p-2 rounded-md bg-surface-muted border border-surface-border flex flex-col gap-0.5 hover:bg-surface-hover/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground tabular-nums">
                {m.time}
              </span>
              <span className="text-[9px] font-bold text-foreground/40">
                #{idx + 1}
              </span>
            </div>
            <div className="text-[10px] font-bold text-foreground/80 truncate">
              {m.title}
            </div>
            <div className="text-[9px] text-foreground/50 leading-tight line-clamp-1">
              {m.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


