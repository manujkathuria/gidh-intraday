"use client";

import React from "react";
import { Calendar } from "lucide-react";

interface Props {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  sessions: string[];
}

export const ModeSwitcher: React.FC<Props> = ({
  selectedDate,
  setSelectedDate,
  sessions,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Session Date Selector */}
      <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2.5 py-1">
        <Calendar className="w-3.5 h-3.5 text-foreground/40" />
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
        >
          {sessions.map((s, idx) => (
            <option key={`${s}-${idx}`} value={s} className="bg-surface text-foreground">
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Local Session Indicator */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-[10px] font-mono text-foreground/60 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>COMPLETED</span>
      </div>
    </div>
  );
};
