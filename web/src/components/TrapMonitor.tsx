"use client";

import React from "react";
import { useReplayStore } from "@/stores/replayStore";
import { AlertTriangle, Flame, ShieldAlert, Sparkles } from "lucide-react";

export const TrapMonitor: React.FC = () => {
  const { traps, setSelectedSymbol } = useReplayStore();

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Live Trap Radar & Breakouts
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {traps.length} Signals
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {traps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/30 text-xs gap-2 text-center p-4">
            <Sparkles className="w-6 h-6 text-white/20" />
            <span>No extreme trap anomalies or Godzilla breakouts detected at this minute snapshot.</span>
          </div>
        ) : (
          traps.map((alert, idx) => {
            const isGodzilla = alert.trap_type === "GODZILLA_BREAKOUT";
            const isBullTrap = alert.trap_type === "BULL_TRAP";
            const isBearTrap = alert.trap_type === "BEAR_TRAP";

            let badgeColor = "bg-white/10 text-white";
            let Icon = AlertTriangle;

            if (isGodzilla) {
              badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
              Icon = Flame;
            } else if (isBullTrap) {
              badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
              Icon = ShieldAlert;
            } else if (isBearTrap) {
              badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
              Icon = ShieldAlert;
            }

            const move = Number(alert.move_pct || 0);
            const rvol = Number(alert.rvol || 0);

            return (
              <div
                key={`${alert.symbol}-${alert.trap_type}-${idx}`}
                onClick={() => setSelectedSymbol(alert.symbol)}
                className="p-3 rounded-lg bg-black/40 border border-white/10 hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {alert.symbol}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {alert.trap_type}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">
                    {alert.confidence}
                  </span>
                </div>

                <p className="text-[11px] text-white/70 leading-snug">
                  {alert.description}
                </p>

                <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono mt-0.5">
                  <span>Sector: {alert.sector}</span>
                  <span>RVOL: {rvol.toFixed(1)}x</span>
                  <span
                    className={
                      move >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    Move: {move >= 0 ? "+" : ""}
                    {move.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
