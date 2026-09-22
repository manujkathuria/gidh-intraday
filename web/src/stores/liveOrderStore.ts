import { create } from "zustand";
import {
  ActivePosition,
  ClosedPosition,
  ManagedOrder,
  RiskState,
  fetchLivePositions,
  fetchClosedPositions,
  fetchManagedOrders,
  fetchRiskState,
  resetTripwire,
  createLiveOrder,
  cancelLimitOrder,
  squareOffLivePosition,
  updateLivePositionLevels,
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
  closedPositions: ClosedPosition[];
  managedOrders: Record<string, ManagedOrder>;
  riskState: RiskState | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  ws: WebSocket | null;

  // Actions
  initLiveOrders: () => Promise<void>;
  connectLiveWebSocket: () => void;
  resetTripwireAction: () => Promise<boolean>;
  placeTrade: (intent: OrderIntent) => Promise<boolean>;
  cancelLimit: (id: string) => Promise<boolean>;
  squareOff: (symbol: string, reason?: string) => Promise<boolean>;
  updatePositionLevels: (symbol: string, stopLossPrice?: number | null, targetPrice?: number | null) => Promise<boolean>;
}

export const useLiveOrderStore = create<LiveOrderState>((set, get) => ({
  activePositions: {},
  closedPositions: [],
  managedOrders: {},
  riskState: null,
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
            const closedPos: ClosedPosition = ev.payload;
            delete current[closedPos.symbol];
            const existingClosed = get().closedPositions.filter((p) => p.id !== closedPos.id);
            set({ activePositions: current, closedPositions: [closedPos, ...existingClosed] });
          } else if ((ev.type === "ORDER_CREATED" || ev.type === "ORDER_STATUS_CHANGED") && ev.payload) {
            const order: ManagedOrder = ev.payload;
            orders[order.id] = order;
            set({ managedOrders: orders });
          } else if (ev.type === "RISK_STATE_CHANGED" && ev.payload) {
            const risk: RiskState = {
              kill_switch: !!ev.payload.kill_switch,
              circuit_broken: !!ev.payload.circuit_broken,
              reason: ev.payload.reason,
            };
            set({ riskState: risk });
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
      const [positions, closed, orders, risk] = await Promise.all([
        fetchLivePositions(),
        fetchClosedPositions(),
        fetchManagedOrders(),
        fetchRiskState(),
      ]);
      const posMap: Record<string, ActivePosition> = {};
      for (const p of positions) {
        posMap[p.symbol] = p;
      }
      const orderMap: Record<string, ManagedOrder> = {};
      for (const order of orders) orderMap[order.id] = order;
      set({
        activePositions: posMap,
        closedPositions: closed,
        managedOrders: orderMap,
        riskState: risk,
        loading: false,
      });

      get().connectLiveWebSocket();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  resetTripwireAction: async () => {
    try {
      const ok = await resetTripwire();
      if (ok) {
        set({ riskState: { kill_switch: false, circuit_broken: false } });
        return true;
      }
      return false;
    } catch {
      return false;
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
      const orders = { ...get().managedOrders, [order.id]: order };
      const current = { ...get().activePositions };
      delete current[symbol];
      const closed = await fetchClosedPositions();
      set({ managedOrders: orders, activePositions: current, closedPositions: closed });
      return true;
    } catch (err) {
      return false;
    }
  },

  updatePositionLevels: async (symbol: string, stopLossPrice?: number | null, targetPrice?: number | null) => {
    try {
      const pos = await updateLivePositionLevels(symbol, stopLossPrice, targetPrice);
      if (!pos) return false;
      const current = { ...get().activePositions, [pos.symbol]: pos };
      set({ activePositions: current });
      return true;
    } catch (err: any) {
      alert(`Update SL/TP Failed: ${err.message}`);
      return false;
    }
  },
}));

