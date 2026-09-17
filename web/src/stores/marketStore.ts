import { create } from "zustand";
import {
  fetchSessions,
  fetchMarketSnapshot,
  fetchMultiIntervalCandles,
  fetchMarketStatus,
  ReplaySnapshot,
  Candle,
  ReplaySector,
  ReplayTrap,
} from "@/lib/api";

interface MarketStoreState {
  sessions: string[];
  selectedDate: string;
  selectedSymbol: string;
  selectedInterval: string;

  snapshot: ReplaySnapshot | null;
  candles: Candle[];
  sectors: ReplaySector[];
  traps: ReplayTrap[];
  wsConnected: boolean;
  isLive: boolean;

  loading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setSelectedSymbol: (symbol: string) => Promise<void>;
  setSelectedInterval: (interval: string) => Promise<void>;
  setWsConnected: (connected: boolean) => void;
  applyLiveSnapshot: (data: Partial<ReplaySnapshot>) => void;
  checkMarketStatus: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMarketStore = create<MarketStoreState>((set, get) => ({
  sessions: [],
  selectedDate: "",
  selectedSymbol: "RELIANCE",
  selectedInterval: "5m",

  snapshot: null,
  candles: [],
  sectors: [],
  traps: [],
  wsConnected: false,
  isLive: false,

  loading: false,
  error: null,

  checkMarketStatus: async () => {
    try {
      const status = await fetchMarketStatus();
      set({ isLive: status.isLive });
    } catch (e) {
      // ignore
    }
  },

  init: async () => {
    // Check Redis live status
    get().checkMarketStatus();

    // If sessions are already loaded and a date is selected, avoid overwriting user choice
    const currentSessions = get().sessions;
    const currentDate = get().selectedDate;

    try {
      set({ loading: !currentDate });
      const sessions = await fetchSessions();
      if (sessions.length === 0) {
        set({ error: "No market sessions available.", loading: false });
        return;
      }

      const activeDate = currentDate && sessions.includes(currentDate) ? currentDate : sessions[0];
      set({ sessions, selectedDate: activeDate });

      // If snapshot already loaded for this activeDate, no need to re-fetch on simple page navigation
      if (get().snapshot?.session_date === activeDate && (get().snapshot?.stocks?.length || 0) > 0) {
        set({ loading: false });
        return;
      }

      const snap = await fetchMarketSnapshot(activeDate);
      if (snap) {
        set({
          snapshot: snap,
          sectors: snap.sectors || [],
          traps: snap.traps || [],
          loading: false,
          error: null,
        });
      }

      // Fetch initial candles
      const { selectedSymbol, selectedInterval } = get();
      const candles = await fetchMultiIntervalCandles(selectedSymbol, activeDate, selectedInterval);
      set({ candles, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to initialize market store", loading: false });
    }
  },

  setSelectedDate: async (date: string) => {
    set({ selectedDate: date, loading: true });
    try {
      const { selectedSymbol, selectedInterval } = get();
      const [snap, candles] = await Promise.all([
        fetchMarketSnapshot(date),
        fetchMultiIntervalCandles(selectedSymbol, date, selectedInterval),
      ]);

      set({
        snapshot: snap,
        sectors: snap?.sectors || [],
        traps: snap?.traps || [],
        candles,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setSelectedSymbol: async (symbol: string) => {
    set({ selectedSymbol: symbol });
    const { selectedDate, selectedInterval } = get();
    if (selectedDate) {
      const candles = await fetchMultiIntervalCandles(symbol, selectedDate, selectedInterval);
      if (get().selectedSymbol === symbol) {
        set({ candles });
      }
    }
  },

  setSelectedInterval: async (interval: string) => {
    set({ selectedInterval: interval });
    const { selectedSymbol, selectedDate } = get();
    if (selectedDate) {
      const candles = await fetchMultiIntervalCandles(selectedSymbol, selectedDate, interval);
      if (get().selectedInterval === interval) {
        set({ candles });
      }
    }
  },

  setWsConnected: (connected: boolean) => {
    set({ wsConnected: connected });
  },

  applyLiveSnapshot: (data: Partial<ReplaySnapshot>) => {
    const { selectedDate, sessions } = get();
    const latestDate = sessions[0];
    
    // Only apply live WebSocket ticks if the user is looking at the active live session
    if (selectedDate && latestDate && selectedDate !== latestDate) {
      return;
    }

    const prev = get().snapshot;
    if (!prev) {
      set({ snapshot: data as ReplaySnapshot });
      return;
    }
    const updated: ReplaySnapshot = {
      ...prev,
      ...data,
      stocks: data.stocks || prev.stocks,
      sectors: data.sectors || prev.sectors,
      traps: data.traps || prev.traps,
      weather: data.weather || prev.weather,
    };
    set({
      snapshot: updated,
      sectors: updated.sectors || [],
      traps: updated.traps || [],
    });
  },

  refresh: async () => {
    const { selectedDate, selectedSymbol, selectedInterval } = get();
    if (!selectedDate) return;
    const snap = await fetchMarketSnapshot(selectedDate);
    const candles = await fetchMultiIntervalCandles(selectedSymbol, selectedDate, selectedInterval);
    set({
      snapshot: snap,
      sectors: snap?.sectors || [],
      traps: snap?.traps || [],
      candles,
    });
  },
}));
