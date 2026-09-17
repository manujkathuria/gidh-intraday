"use client";

import React from "react";
import { useLiveStore } from "@/stores/liveStore";
import { useAppModeStore } from "@/stores/appModeStore";

interface Props {
  isCollapsed: boolean;
}

export const SidebarFooterStatus: React.FC<Props> = ({ isCollapsed }) => {
  const mode = useAppModeStore((s) => s.mode);
  const isMarketOpen = useLiveStore((s) => s.isMarketOpen);
  const ws = useLiveStore((s) => s.ws);

  const isLiveStreaming = mode === "LIVE" && isMarketOpen && ws?.readyState === WebSocket.OPEN;
  const statusLabel = mode === "REPLAY" ? "REPLAY" : isMarketOpen ? "LIVE" : "STANDBY";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            isLiveStreaming ? "bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" : "bg-foreground/30"
          }`}
          title={`Zerodha Kite: ${statusLabel}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none">
      <div className="flex items-center justify-between px-2 py-1 text-[11px] text-foreground/60 rounded bg-surface-muted/50 border border-surface-border/60">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLiveStreaming ? "bg-emerald-500 animate-pulse" : "bg-foreground/30"
            }`}
          />
          <span className="font-medium text-foreground/70">Zerodha Kite</span>
        </div>
        <span
          className={`font-bold text-[10px] tracking-wider uppercase ${
            isLiveStreaming ? "text-emerald-400" : "text-foreground/40"
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
};

