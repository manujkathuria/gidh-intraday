import { create } from "zustand";
import {
  ActivePosition,
  fetchLivePositions,
  createLiveOrder,
  squareOffLivePosition,
  OrderIntent,
} from "@/lib/api";

const getLiveWsUrl = () => {
  if (process.env.NEXT_PUBLIC_LIVE_WS_URL) {
    return process.env.NEXT_PUBLIC_LIVE_WS_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "ws://127.0.0.1:8080/v1/live/orders/ws";
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/v1/live/orders/ws`;
  }
  return "ws://127.0.0.1:8080/v1/live/orders/ws";
};


interface LiveOrderState {
  activePositions: Record<string, ActivePosition>;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  ws: WebSocket | null;

  // Actions
  initLiveOrders: () => Promise<void>;
  connectLiveWebSocket: () => void;
  placeTrade: (intent: OrderIntent) => Promise<boolean>;
  squareOff: (symbol: string, reason?: string) => Promise<boolean>;
}

export const useLiveOrderStore = create<LiveOrderState>((set, get) => ({
  activePositions: {},
  isConnected: false,
  loading: false,
  error: null,
  ws: null,

  connectLiveWebSocket: () => {
    const existingWs = get().ws;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const socket = new WebSocket(getLiveWsUrl());

      socket.onopen = () => {
        set({ isConnected: true, ws: socket });
      };

      socket.onmessage = (event) => {
        try {
          const ev = JSON.parse(event.data);
          const current = { ...get().activePositions };

          if (ev.type === "INITIAL_STATE" && ev.payload) {
            set({ activePositions: ev.payload });
          } else if (ev.type === "TICK" && ev.payload) {
            const pos: ActivePosition = ev.payload;
            current[pos.symbol] = pos;
            set({ activePositions: current });
          } else if (ev.type === "POSITION_OPENED" && ev.payload) {
            const pos: ActivePosition = ev.payload;
            current[pos.symbol] = pos;
            set({ activePositions: current });
          } else if (ev.type === "POSITION_CLOSED" && ev.payload) {
            const sym = ev.payload.symbol;
            delete current[sym];
            set({ activePositions: current });
          }
        } catch (err) {
          console.error("[LIVE WS] Message parse error:", err);
        }
      };

      socket.onclose = () => {
        set({ isConnected: false, ws: null });
        setTimeout(() => {
          get().connectLiveWebSocket();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error("[LIVE WS] Error:", err);
      };
    } catch (err) {
      console.error("[LIVE WS] Init error:", err);
    }
  },

  initLiveOrders: async () => {
    try {
      set({ loading: true });
      const positions = await fetchLivePositions();
      const posMap: Record<string, ActivePosition> = {};
      for (const p of positions) {
        posMap[p.symbol] = p;
      }
      set({ activePositions: posMap, loading: false });

      get().connectLiveWebSocket();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  placeTrade: async (intent: OrderIntent) => {
    try {
      const res = await createLiveOrder(intent);
      if (res) {
        const current = { ...get().activePositions };
        current[res.symbol] = res;
        set({ activePositions: current });
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Order Failed: ${err.message}`);
      return false;
    }
  },

  squareOff: async (symbol: string, reason = "MANUAL_SQUARE_OFF") => {
    try {
      const ok = await squareOffLivePosition(symbol, reason);
      if (ok) {
        const current = { ...get().activePositions };
        delete current[symbol];
        set({ activePositions: current });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  },
}));
