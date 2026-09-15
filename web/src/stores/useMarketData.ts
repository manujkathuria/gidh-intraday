import { useEffect } from "react";
import { useAppModeStore } from "./appModeStore";
import { useLiveStore } from "./liveStore";
import { useReplayStore } from "./replayStore";
import { ReplaySnapshot, Candle, ReplaySector, ReplayTrap } from "@/lib/api";

export interface UnifiedMarketData {
  mode: "LIVE" | "REPLAY";
  sessionDate: string;
  currentTimeMinutes: number;
  selectedSymbol: string;
  snapshot: ReplaySnapshot | null;
  candles: Candle[];
  traps: ReplayTrap[];
  sectors: ReplaySector[];
  loading: boolean;
  error: string | null;

  // Common Actions
  init: () => Promise<void>;
  setSelectedSymbol: (symbol: string) => Promise<void> | void;
  refresh: () => Promise<void>;
}

export function useMarketData(): UnifiedMarketData {
  const mode = useAppModeStore((s) => s.mode);
  const live = useLiveStore();
  const replay = useReplayStore();

  useEffect(() => {
    if (mode === "LIVE") {
      live.initLive();
    } else {
      live.stopLiveSync();
      replay.init();
    }
  }, [mode]);

  if (mode === "LIVE") {
    return {
      mode: "LIVE",
      sessionDate: live.sessionDate,
      currentTimeMinutes: live.currentTimeMinutes,
      selectedSymbol: live.selectedSymbol,
      snapshot: live.snapshot,
      candles: live.candles,
      traps: live.traps,
      sectors: live.sectors,
      loading: live.loading,
      error: live.error,
      init: live.initLive,
      setSelectedSymbol: live.setSelectedSymbol,
      refresh: live.refreshLive,
    };
  }

  return {
    mode: "REPLAY",
    sessionDate: replay.selectedDate,
    currentTimeMinutes: replay.currentTimeMinutes,
    selectedSymbol: replay.selectedSymbol,
    snapshot: replay.snapshot,
    candles: replay.candles,
    traps: replay.traps,
    sectors: replay.sectors,
    loading: replay.loading,
    error: replay.error,
    init: replay.init,
    setSelectedSymbol: (sym: string) => {
      replay.setSelectedSymbol(sym);
    },
    refresh: replay.refreshSnapshot,
  };
}
