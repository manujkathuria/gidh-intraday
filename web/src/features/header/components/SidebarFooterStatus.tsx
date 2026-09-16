"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useLiveStore } from "@/stores/liveStore";
import { useAppModeStore } from "@/stores/appModeStore";

interface Props {
  breadth: number;
  isCollapsed: boolean;
}

export const SidebarFooterStatus: React.FC<Props> = ({ breadth, isCollapsed }) => {
  const isBullish = breadth >= 50;
  const mode = useAppModeStore((s) => s.mode);
  const isMarketOpen = useLiveStore((s) => s.isMarketOpen);
  const ws = useLiveStore((s) => s.ws);

  const isLiveStreaming = mode === "LIVE" && isMarketOpen && ws?.readyState === WebSocket.OPEN;
  const statusLabel = mode === "REPLAY" ? "REPLAY" : isMarketOpen ? "LIVE" : "STANDBY";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-3 border-t border-surface-border text-xs">
        <div
          className="p-2 rounded bg-surface-muted border border-surface-border text-foreground flex items-center justify-center"
          title={`Market Breadth (VWAP): ${breadth.toFixed(0)}% (${isBullish ? "BULL" : "BEAR"})`}
        >
          <Activity className="w-3.5 h-3.5 text-foreground" />
        </div>
        <div
          className={`h-2 w-2 rounded-full ${
            isLiveStreaming ? "bg-emerald-500 animate-pulse" : "bg-foreground/40"
          }`}
          title={`Zerodha Kite: ${statusLabel}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-3 border-t border-surface-border text-xs">
      <div className="flex items-center justify-between px-2.5 py-1 rounded bg-surface-muted border border-surface-border text-foreground/70">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-foreground/50" />
          <span className="text-[10px] text-foreground/50 uppercase">VWAP</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-foreground">{breadth.toFixed(0)}%</span>
          <span className="text-[9px] text-foreground/50">
            {isBullish ? "BULL" : "BEAR"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2.5 py-1 text-[10px] text-foreground/50">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLiveStreaming ? "bg-emerald-500 animate-pulse" : "bg-foreground/30"
            }`}
          />
          <span>Zerodha Kite</span>
        </div>
        <span
          className={`font-bold ${
            isLiveStreaming ? "text-emerald-400" : "text-foreground/40"
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
};
