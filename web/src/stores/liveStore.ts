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

const getLiveMarketWsUrl = () => {
  if (process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL) {
    return process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "ws://127.0.0.1:8080/v1/live/market/ws";
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/v1/live/market/ws`;
  }
  return "ws://127.0.0.1:8080/v1/live/market/ws";
};

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
  ws: WebSocket | null;

  // Actions
  initLive: () => Promise<void>;
  startLiveSync: () => void;
  stopLiveSync: () => void;
  setSelectedSymbol: (symbol: string) => Promise<void>;
  refreshLive: () => Promise<void>;
}

let shouldReconnectLiveMarket = true;
let liveMarketReconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function getISTMinutes(): { minutes: number; isMarketOpen: boolean; timeStr: string } {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  // IST is UTC + 5:30 (330 minutes)
  const totalISTMinutes = (utcHours * 60 + utcMinutes + 330) % 1440;
  const isMarketOpen = totalISTMinutes >= 555 && totalISTMinutes <= 930; // 09:15 to 15:30

  const effectiveMins = isMarketOpen ? totalISTMinutes : Math.min(930, Math.max(555, totalISTMinutes));
  const hours = Math.floor(effectiveMins / 60);
  const minutes = effectiveMins % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  return { minutes: effectiveMins, isMarketOpen, timeStr };
}

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
  ws: null,

  initLive: async () => {
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

      if (!isMarketOpen) {
        // Off-market hours: Load static snapshot via REST
        const snap = await fetchReplaySnapshot(todayDate, "15:30:00");
        const candles = await fetchReplayCandles(todayDate, get().selectedSymbol, "15:30:00");
        set({
          snapshot: snap,
          traps: snap?.traps || [],
          sectors: snap?.sectors || [],
          candles: candles || [],
          loading: false,
          error: null,
        });
        return;
      }

      get().startLiveSync();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initialize live store";
      set({ error: message, loading: false });
    }
  },

  startLiveSync: () => {
    const { isMarketOpen } = getISTMinutes();
    if (!isMarketOpen) {
      return;
    }
    shouldReconnectLiveMarket = true;
    const existing = get().ws;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const socket = new WebSocket(getLiveMarketWsUrl());
      set({ ws: socket, loading: true, error: null });

      socket.onopen = () => {
        const { selectedSymbol } = get();
        socket.send(JSON.stringify({ action: "SELECT_SYMBOL", symbol: selectedSymbol }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "MARKET_SNAPSHOT" && data.snapshot) {
            const timeParts = (data.time || data.snapshot.as_of_time || "09:15:00").split(":");
            const mins = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
            const { isMarketOpen: openNow } = getISTMinutes();

            set({
              sessionDate: data.session_date || data.snapshot.session_date || get().sessionDate,
              currentTimeMinutes: mins,
              lastSyncTime: data.time || data.snapshot.as_of_time || get().lastSyncTime,
              isMarketOpen: openNow,
              snapshot: data.snapshot,
              traps: data.snapshot.traps || [],
              sectors: data.snapshot.sectors || [],
              loading: false,
              error: null,
            });
          } else if (data.type === "SYMBOL_CANDLES" && Array.isArray(data.candles)) {
            set({ candles: data.candles, loading: false, error: null });
          } else if (data.type === "ERROR") {
            set({ error: data.error || "Live market stream error", loading: false });
          }
        } catch (err) {
          console.error("[LIVE MARKET WS] Message parse error:", err);
        }
      };

      socket.onclose = () => {
        if (get().ws === socket) {
          set({ ws: null });
          if (shouldReconnectLiveMarket) {
            liveMarketReconnectTimer = setTimeout(() => get().startLiveSync(), 2000);
          }
        }
      };

      socket.onerror = (err) => {
        console.error("[LIVE MARKET WS] Error:", err);
        set({ error: "Live market stream disconnected", loading: false });
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect live market stream";
      set({ error: message, loading: false });
    }
  },

  stopLiveSync: () => {
    shouldReconnectLiveMarket = false;
    if (liveMarketReconnectTimer !== null) {
      clearTimeout(liveMarketReconnectTimer);
      liveMarketReconnectTimer = null;
    }
    get().ws?.close();
    set({ ws: null });
  },

  setSelectedSymbol: async (symbol: string) => {
    set({ selectedSymbol: symbol });
    const { ws, sessionDate, isMarketOpen } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "SELECT_SYMBOL", symbol }));
    } else if (!isMarketOpen && sessionDate) {
      const candles = await fetchReplayCandles(sessionDate, symbol, "15:30:00");
      set({ candles: candles || [] });
    }
  },

  refreshLive: async () => {
    get().initLive();
  },
}));
