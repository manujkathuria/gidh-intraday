import { create } from "zustand";
import {
  fetchMarketSnapshot,
  fetchMultiIntervalCandles,
  fetchMarketStatus,
  ReplaySnapshot,
  Candle,
  ReplaySector,
  ReplayTrap,
} from "@/lib/api";
import { initMarketState, mergeLiveSnapshot } from "./marketStoreHelpers";

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
  selectedInterval: "1d",

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
    } catch {
      // ignore
    }
  },

  init: async () => initMarketState(get, set),

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
      if (get().selectedSymbol === symbol) set({ candles });
    }
  },

  setSelectedInterval: async (interval: string) => {
    set({ selectedInterval: interval });
    const { selectedSymbol, selectedDate } = get();
    if (selectedDate) {
      const candles = await fetchMultiIntervalCandles(selectedSymbol, selectedDate, interval);
      if (get().selectedInterval === interval) set({ candles });
    }
  },

  setWsConnected: (connected: boolean) => set({ wsConnected: connected }),

  applyLiveSnapshot: (data: Partial<ReplaySnapshot>) => {
    const { selectedDate, sessions } = get();
    if (selectedDate && sessions[0] && selectedDate !== sessions[0]) return;
    const updated = mergeLiveSnapshot(get().snapshot, data);
    set({ snapshot: updated, sectors: updated.sectors || [], traps: updated.traps || [] });
  },

  refresh: async () => {
    const { selectedDate, selectedSymbol, selectedInterval } = get();
    if (!selectedDate) return;
    const snap = await fetchMarketSnapshot(selectedDate);
    const candles = await fetchMultiIntervalCandles(selectedSymbol, selectedDate, selectedInterval);
    set({ snapshot: snap, sectors: snap?.sectors || [], traps: snap?.traps || [], candles });
  },
}));
