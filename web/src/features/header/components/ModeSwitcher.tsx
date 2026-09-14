"use client";

import React from "react";
import { Radio, RotateCcw, Calendar } from "lucide-react";

interface Props {
  mode: "LIVE" | "REPLAY";
  setMode: (mode: "LIVE" | "REPLAY") => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  sessions: string[];
}

export const ModeSwitcher: React.FC<Props> = ({
  mode,
  setMode,
  selectedDate,
  setSelectedDate,
  sessions,
}) => {
  return (
    <div className="flex items-center gap-3">
      {/* Mode Switcher: LIVE vs REPLAY (Pure Monochrome) */}
      <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5 text-xs">
        <button
          onClick={() => setMode("LIVE")}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition text-xs ${
            mode === "LIVE"
              ? "bg-foreground text-background shadow-sm font-black"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>LIVE</span>
        </button>
        <button
          onClick={() => setMode("REPLAY")}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition text-xs ${
            mode === "REPLAY"
              ? "bg-foreground text-background shadow-sm font-black"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>REPLAY</span>
        </button>
      </div>

      {/* Date Selector (Only in REPLAY mode) */}
      {mode === "REPLAY" && (
        <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2.5 py-1">
          <Calendar className="w-3.5 h-3.5 text-foreground/40" />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
          >
            {sessions.map((s, idx) => (
              <option key={`${s}-${idx}`} value={s} className="bg-surface text-foreground">
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
