"use client";

import React from "react";
import { useReplayStore } from "@/stores/replayStore";
import { Shield } from "lucide-react";

export const SectorBattalions: React.FC = () => {
  const { sectors, snapshot, setSelectedSymbol } = useReplayStore();

  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-white/40 text-xs">
        Loading Sector Battalions...
      </div>
    );
  }

  // Find top stocks for each sector from snapshot
  const stocksBySector: Record<string, any[]> = {};
  if (snapshot?.stocks) {
    for (const s of snapshot.stocks) {
      if (!stocksBySector[s.sector]) stocksBySector[s.sector] = [];
      stocksBySector[s.sector].push(s);
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Sector Clan Strength
          </span>
        </div>
        <span className="text-[10px] text-white/40">
          Ranked by % Above VWAP
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {sectors.map((sec) => {
          const pctAbove = Number(sec.pct_above_vwap || 0);
          const isBull = pctAbove >= 50;
          const civCount = sec.civ_count || 0;
          const sectorStocks = (stocksBySector[sec.sector] || []).slice(0, 4);

          return (
            <div
              key={sec.sector}
              className="p-2.5 rounded-lg bg-black/30 border border-white/5 hover:border-white/15 transition-all"
            >
              {/* Sector Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {sec.sector}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      isBull ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {pctAbove.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-white/40">
                    ({civCount} Civs)
                  </span>
                </div>
              </div>

              {/* Clan Strength Bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isBull ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.max(5, pctAbove)}%` }}
                />
              </div>

              {/* Clan Vanguard Stocks */}
              <div className="flex flex-wrap gap-1 items-center">
                {sectorStocks.map((stk) => {
                  const move = Number(stk.move_pct || 0);
                  return (
                    <button
                      key={stk.symbol}
                      onClick={() => setSelectedSymbol(stk.symbol)}
                      className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 hover:bg-indigo-600/30 text-white/70 hover:text-white border border-white/5 transition flex items-center gap-1"
                    >
                      <span>{stk.symbol}</span>
                      <span
                        className={move >= 0 ? "text-emerald-400" : "text-rose-400"}
                      >
                        {move >= 0 ? "+" : ""}
                        {move.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
