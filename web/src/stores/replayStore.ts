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

const getReplayWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "ws://127.0.0.1:8080/v1/replay/ws";
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/v1/replay/ws`;
  }
  return "ws://127.0.0.1:8080/v1/replay/ws";
};


interface ReplayState {
  // Mode & Timeline State
  mode: "LIVE" | "REPLAY";
  sessions: string[];
  selectedDate: string;
  currentTimeMinutes: number; // 09:15 = 555 min, 15:30 = 930 min
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 5x, 10x
  isConnected: boolean;

  // Market Data
  snapshot: ReplaySnapshot | null;
  selectedSymbol: string;
  candles: Candle[];
  traps: ReplayTrap[];
  sectors: ReplaySector[];
  loading: boolean;
  error: string | null;

  // WebSocket reference
  ws: WebSocket | null;

  // Actions
  init: () => Promise<void>;
  connectWebSocket: () => void;
  setMode: (mode: "LIVE" | "REPLAY") => void;
  setSelectedDate: (date: string) => void;
  setCurrentTimeMinutes: (minutes: number) => void;
  stepForward: (step?: number) => void;
  stepBackward: (step?: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedSymbol: (symbol: string) => void;
  refreshSnapshot: () => Promise<void>;
}

export function formatMinutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  mode: "LIVE",
  sessions: [],
  selectedDate: "",
  currentTimeMinutes: 554, // 09:14 AM Pre-market standby
  isPlaying: false,
  playbackSpeed: 1,
  isConnected: false,

  snapshot: null,
  selectedSymbol: "RELIANCE",
  candles: [],
  traps: [],
  sectors: [],
  loading: false,
  error: null,
  ws: null,

  setMode: (mode: "LIVE" | "REPLAY") => {
    set({ mode });
    const { sessions, ws, playbackSpeed, selectedSymbol } = get();
    if (mode === "LIVE") {
      const latestDate = sessions.length > 0 ? sessions[0] : "";
      
      const now = new Date();
      // Current IST time in minutes
      const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      const isMarketOpen = istMinutes >= 555 && istMinutes <= 930;

      // If during active market hours: current minutes; if outside market hours: 15:30 (930 min, full completed day)
      const currentMins = isMarketOpen ? istMinutes : 930;
      const timeStr = formatMinutesToTime(currentMins);

      set({ selectedDate: latestDate, currentTimeMinutes: currentMins, isPlaying: false });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "PAUSE" }));
        ws.send(
          JSON.stringify({
            action: "SUBSCRIBE",
            session_date: latestDate,
            time: timeStr,
            speed: 1,
            symbol: selectedSymbol,
          })
        );
      }
      get().refreshSnapshot();
    } else {
      // In REPLAY mode, reset time to 09:14:00 (554 mins) for clean pre-market start
      const { selectedDate } = get();
      set({ currentTimeMinutes: 554, isPlaying: false });
      if (ws && ws.readyState === WebSocket.OPEN && selectedDate) {
        ws.send(JSON.stringify({ action: "PAUSE" }));
        ws.send(
          JSON.stringify({
            action: "SUBSCRIBE",
            session_date: selectedDate,
            time: "09:14:00",
            speed: playbackSpeed,
            symbol: selectedSymbol,
          })
        );
      }
      get().refreshSnapshot();
    }
  },

  connectWebSocket: () => {
    const existingWs = get().ws;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const socket = new WebSocket(getReplayWsUrl());

      socket.onopen = () => {
        set({ isConnected: true, ws: socket });
        const { selectedDate, currentTimeMinutes, playbackSpeed, selectedSymbol } = get();
        if (selectedDate) {
          socket.send(
            JSON.stringify({
              action: "SUBSCRIBE",
              session_date: selectedDate,
              time: formatMinutesToTime(currentTimeMinutes),
              speed: playbackSpeed,
              symbol: selectedSymbol,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "SNAPSHOT" && data.snapshot) {
            const timeParts = (data.time || "09:14:00").split(":");
            const mins = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);

            set({
              snapshot: data.snapshot,
              traps: data.snapshot.traps || [],
              sectors: data.snapshot.sectors || [],
              currentTimeMinutes: mins,
            });
          } else if (data.type === "CANDLES" && data.candles) {
            set({ candles: data.candles });
          }
        } catch (err) {
          console.error("[WS] Message error:", err);
        }
      };

      socket.onclose = () => {
        set({ isConnected: false, ws: null });
        setTimeout(() => {
          if (!get().isConnected) {
            get().connectWebSocket();
          }
        }, 2000);
      };

      socket.onerror = (err) => {
        console.error("[WS] Connection error:", err);
      };
    } catch (err) {
      console.error("[WS] Initialization error:", err);
    }
  },

  init: async () => {
    // If already initialized with sessions and date, do not reset playback timeline
    if (get().sessions.length > 0 && get().selectedDate) {
      if (!get().isConnected) {
        get().connectWebSocket();
      }
      return;
    }

    try {
      set({ loading: true });
      const sessions = await fetchSessions();
      if (sessions.length === 0) {
        set({ error: "No market sessions available.", loading: false });
        return;
      }
      const defaultDate = sessions[0];
      const now = new Date();
      const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      const isMarketOpen = istMinutes >= 555 && istMinutes <= 930;
      const initialMins = isMarketOpen ? istMinutes : 930;

      set({ sessions, selectedDate: defaultDate, currentTimeMinutes: initialMins, loading: false });

      // Connect persistent WebSocket
      get().connectWebSocket();
      await get().refreshSnapshot();
    } catch (err: any) {
      set({ error: err.message || "Failed to initialize", loading: false });
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date, isPlaying: false, currentTimeMinutes: 554 });
    const { ws, playbackSpeed, selectedSymbol } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "PAUSE" }));
      ws.send(
        JSON.stringify({
          action: "SUBSCRIBE",
          session_date: date,
          time: "09:14:00",
          speed: playbackSpeed,
          symbol: selectedSymbol,
        })
      );
    } else {
      get().refreshSnapshot();
    }
  },

  setCurrentTimeMinutes: (minutes: number) => {
    const clamped = Math.max(554, Math.min(930, minutes));
    set({ currentTimeMinutes: clamped });
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: "SEEK",
          time: formatMinutesToTime(clamped),
        })
      );
    } else {
      get().refreshSnapshot();
    }
  },

  stepForward: (step = 1) => {
    const next = Math.min(930, get().currentTimeMinutes + step);
    get().setCurrentTimeMinutes(next);
  },

  stepBackward: (step = 1) => {
    const prev = Math.max(555, get().currentTimeMinutes - step);
    get().setCurrentTimeMinutes(prev);
  },

  togglePlay: () => {
    const isPlaying = !get().isPlaying;
    set({ isPlaying });
    const { ws, playbackSpeed } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: isPlaying ? "PLAY" : "PAUSE",
          speed: playbackSpeed,
        })
      );
    }
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: "SET_SPEED",
          speed,
        })
      );
    }
  },

  setSelectedSymbol: (symbol: string) => {
    set({ selectedSymbol: symbol });
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: "SELECT_SYMBOL",
          symbol,
        })
      );
    }
  },

  refreshSnapshot: async () => {
    const { selectedDate, currentTimeMinutes } = get();
    if (!selectedDate) return;
    const timeStr = formatMinutesToTime(currentTimeMinutes);

    const snapshot = await fetchReplaySnapshot(selectedDate, timeStr);
    if (snapshot) {
      set({
        snapshot,
        traps: snapshot.traps || [],
        sectors: snapshot.sectors || [],
        loading: false,
      });
    }
  },
}));
