"use client";

import React from "react";
import { Radio, RotateCcw } from "lucide-react";

interface Props {
  mode: "LIVE" | "REPLAY";
  setMode: (mode: "LIVE" | "REPLAY") => void;
  isCollapsed: boolean;
}

export const SidebarModeSwitcher: React.FC<Props> = ({
  mode,
  setMode,
  isCollapsed,
}) => {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-surface-border">
        <button
          onClick={() => setMode(mode === "LIVE" ? "REPLAY" : "LIVE")}
          title={
            mode === "LIVE"
              ? "LIVE Mode Active (Click for Replay)"
              : "REPLAY Mode Active (Click for Live)"
          }
          className={`h-8 w-8 rounded-lg transition flex items-center justify-center cursor-pointer border ${
            mode === "LIVE"
              ? "bg-foreground text-background font-black border-foreground shadow-xs"
              : "bg-surface-muted text-foreground/70 border-surface-border hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          {mode === "LIVE" ? (
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pt-2 border-t border-surface-border select-none">
      <div className="flex items-center bg-surface-muted border border-surface-border rounded-lg p-0.5 w-full text-xs h-8">
        <button
          onClick={() => setMode("LIVE")}
          className={`flex-1 h-full rounded-md flex items-center justify-center gap-1.5 font-bold transition text-xs cursor-pointer ${
            mode === "LIVE"
              ? "bg-foreground text-background shadow-xs font-black"
              : "text-foreground/50 hover:text-foreground hover:bg-surface-hover/50"
          }`}
        >
          <Radio
            className={`w-3 h-3 ${
              mode === "LIVE" ? "text-emerald-400 animate-pulse" : ""
            }`}
          />
          <span>LIVE</span>
        </button>

        <button
          onClick={() => setMode("REPLAY")}
          className={`flex-1 h-full rounded-md flex items-center justify-center gap-1.5 font-bold transition text-xs cursor-pointer ${
            mode === "REPLAY"
              ? "bg-foreground text-background shadow-xs font-black"
              : "text-foreground/50 hover:text-foreground hover:bg-surface-hover/50"
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>REPLAY</span>
        </button>
      </div>
    </div>
  );
};
