import { create } from "zustand";
import {
  ActivePosition,
  ManagedOrder,
  fetchLivePositions,
  fetchManagedOrders,
  createLiveOrder,
  cancelLimitOrder,
  squareOffLivePosition,
  OrderIntent,
} from "@/lib/api";
import { auth } from "@/lib/firebase";

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
  managedOrders: Record<string, ManagedOrder>;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  ws: WebSocket | null;

  // Actions
  initLiveOrders: () => Promise<void>;
  connectLiveWebSocket: () => void;
  placeTrade: (intent: OrderIntent) => Promise<boolean>;
  cancelLimit: (id: string) => Promise<boolean>;
  squareOff: (symbol: string, reason?: string) => Promise<boolean>;
}

export const useLiveOrderStore = create<LiveOrderState>((set, get) => ({
  activePositions: {},
  managedOrders: {},
  isConnected: false,
  loading: false,
  error: null,
  ws: null,

  connectLiveWebSocket: async () => {
    const existingWs = get().ws;
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const baseUrl = getLiveWsUrl();
      const socket = new WebSocket(token ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}auth=${encodeURIComponent(token)}` : baseUrl);

      socket.onopen = () => {
        set({ isConnected: true, ws: socket });
      };

      socket.onmessage = (event) => {
        try {
          const ev = JSON.parse(event.data);
          const current = { ...get().activePositions };
          const orders = { ...get().managedOrders };

          if (ev.type === "INITIAL_STATE" && ev.payload) {
            const initialPositions: Record<string, ActivePosition> = {};
            for (const pos of ev.payload.positions || []) initialPositions[pos.symbol] = pos;
            const initialOrders: Record<string, ManagedOrder> = {};
            for (const order of ev.payload.orders || []) initialOrders[order.id] = order;
            set({ activePositions: initialPositions, managedOrders: initialOrders });
          } else if (ev.type === "POSITION_UPDATED" && ev.payload) {
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
          } else if ((ev.type === "ORDER_CREATED" || ev.type === "ORDER_STATUS_CHANGED") && ev.payload) {
            const order: ManagedOrder = ev.payload;
            orders[order.id] = order;
            set({ managedOrders: orders });
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
      const [positions, orders] = await Promise.all([fetchLivePositions(), fetchManagedOrders()]);
      const posMap: Record<string, ActivePosition> = {};
      for (const p of positions) {
        posMap[p.symbol] = p;
      }
      const orderMap: Record<string, ManagedOrder> = {};
      for (const order of orders) orderMap[order.id] = order;
      set({ activePositions: posMap, managedOrders: orderMap, loading: false });

      get().connectLiveWebSocket();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  placeTrade: async (intent: OrderIntent) => {
    try {
      intent.client_order_id = intent.client_order_id ?? crypto.randomUUID();
      const res = await createLiveOrder(intent);
      if (res) {
        const orders = { ...get().managedOrders, [res.id]: res };
        set({ managedOrders: orders });
        if (res.status === "FILLED") {
          const positions = await fetchLivePositions();
          const current: Record<string, ActivePosition> = {};
          for (const position of positions) current[position.symbol] = position;
          set({ activePositions: current });
        }
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Order Failed: ${err.message}`);
      return false;
    }
  },

  cancelLimit: async (id: string) => {
    try {
      const order = await cancelLimitOrder(id);
      if (!order) return false;
      set({ managedOrders: { ...get().managedOrders, [order.id]: order } });
      return true;
    } catch {
      return false;
    }
  },

  squareOff: async (symbol: string, reason = "MANUAL_SQUARE_OFF") => {
    try {
      const order = await squareOffLivePosition(symbol, reason);
      if (!order) return false;
      set({ managedOrders: { ...get().managedOrders, [order.id]: order } });
      return true;
    } catch (err) {
      return false;
    }
  },
}));
