import { create } from "zustand";
import {
  fetchSessions,
  fetchReplaySnapshot,
  fetchReplayCandles,
  ReplaySnapshot,
  Candle,
  ReplaySector,
  ReplayTrap,
} from "@/lib/api";
import { formatMinutesToTime } from "./replayStore";

interface LiveState {
  sessionDate: string;
  currentTimeMinutes: number;
  lastSyncTime: string;
  isMarketOpen: boolean;
  selectedSymbol: string;

  // Market Data
  snapshot: ReplaySnapshot | null;
  candles: Candle[];
  traps: ReplayTrap[];
  sectors: ReplaySector[];
  loading: boolean;
  error: string | null;

  // Actions
  initLive: () => Promise<void>;
  startLiveSync: () => void;
  stopLiveSync: () => void;
  setSelectedSymbol: (symbol: string) => Promise<void>;
  refreshLive: () => Promise<void>;
}

let syncTimer: NodeJS.Timeout | null = null;
let lastSyncedMinute = -1;

export function getISTMinutes(): { minutes: number; isMarketOpen: boolean; timeStr: string } {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // IST is UTC + 5:30 (330 minutes)
  const totalISTMinutes = (utcHours * 60 + utcMinutes + 330) % 1440;
  const isMarketOpen = totalISTMinutes >= 555 && totalISTMinutes <= 930; // 09:15 to 15:30

  const effectiveMins = isMarketOpen ? totalISTMinutes : Math.min(930, Math.max(555, totalISTMinutes));
  const timeStr = formatMinutesToTime(effectiveMins);

  return { minutes: effectiveMins, isMarketOpen, timeStr };
}

let isFetching = false;

export const useLiveStore = create<LiveState>((set, get) => ({
  sessionDate: "",
  currentTimeMinutes: 555,
  lastSyncTime: "--:--:--",
  isMarketOpen: false,
  selectedSymbol: "RELIANCE",

  snapshot: null,
  candles: [],
  traps: [],
  sectors: [],
  loading: false,
  error: null,

  initLive: async () => {
    // If already initialized with date and sync loop running, skip full init
    if (get().sessionDate && syncTimer !== null) {
      return;
    }

    try {
      set({ loading: true });
      const sessions = await fetchSessions();
      if (sessions.length === 0) {
        set({ error: "No market sessions found", loading: false });
        return;
      }

      const todayDate = sessions[0];
      const { minutes, isMarketOpen, timeStr } = getISTMinutes();

      set({
        sessionDate: todayDate,
        currentTimeMinutes: minutes,
        isMarketOpen,
        lastSyncTime: timeStr,
      });

      await get().refreshLive();
      get().startLiveSync();
    } catch (err: any) {
      set({ error: err.message || "Failed to initialize live store", loading: false });
    }
  },

  startLiveSync: () => {
    if (syncTimer !== null) {
      clearInterval(syncTimer);
    }

    // Run continuous 5-second real-time sync
    syncTimer = setInterval(async () => {
      const current = get();
      if (current.sessionDate) {
        await current.refreshLive();
      }
    }, 5000);
  },

  stopLiveSync: () => {
    if (syncTimer !== null) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  },

  setSelectedSymbol: async (symbol: string) => {
    set({ selectedSymbol: symbol });
    const { sessionDate, currentTimeMinutes } = get();
    if (!sessionDate) return;

    const timeStr = formatMinutesToTime(currentTimeMinutes);
    try {
      const candles = await fetchReplayCandles(sessionDate, symbol, timeStr, "1m");
      if (candles) {
        set({ candles });
      }
    } catch (err) {
      console.error("[LIVE STORE] Failed to fetch candles for", symbol, err);
    }
  },

  refreshLive: async () => {
    if (isFetching) return;
    isFetching = true;

    const { sessionDate, selectedSymbol } = get();
    if (!sessionDate) {
      isFetching = false;
      return;
    }

    const { minutes, isMarketOpen, timeStr } = getISTMinutes();

    try {
      const [snapshot, candles] = await Promise.all([
        fetchReplaySnapshot(sessionDate, timeStr),
        selectedSymbol ? fetchReplayCandles(sessionDate, selectedSymbol, timeStr, "1m") : Promise.resolve([]),
      ]);

      if (snapshot) {
        set({
          snapshot,
          traps: snapshot.traps || [],
          sectors: snapshot.sectors || [],
          currentTimeMinutes: minutes,
          isMarketOpen,
          lastSyncTime: timeStr,
          loading: false,
        });
      }
      if (candles && candles.length > 0) {
        set({ candles });
      }
    } catch (err: any) {
      console.error("[LIVE STORE] refreshLive error:", err);
      set({ error: err.message || "Error syncing live market data", loading: false });
    } finally {
      isFetching = false;
    }
  },
}));
