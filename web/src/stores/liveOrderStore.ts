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
import { connectLiveWebSocket } from "./liveOrderWsConnect";

interface LiveOrderState {
  activePositions: Record<string, ActivePosition>;
  closedPositions: ClosedPosition[];
  managedOrders: Record<string, ManagedOrder>;
  riskState: RiskState | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  ws: WebSocket | null;

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

  connectLiveWebSocket: () => connectLiveWebSocket(get, set),

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
      for (const p of positions) posMap[p.symbol] = p;
      const orderMap: Record<string, ManagedOrder> = {};
      for (const order of orders) orderMap[order.id] = order;
      set({ activePositions: posMap, closedPositions: closed, managedOrders: orderMap, riskState: risk, loading: false });
      get().connectLiveWebSocket();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  resetTripwireAction: async () => {
    const ok = await resetTripwire();
    if (ok) set({ riskState: { kill_switch: false, circuit_broken: false } });
    return ok;
  },

  placeTrade: async (intent: OrderIntent) => {
    try {
      intent.client_order_id = intent.client_order_id ?? crypto.randomUUID();
      const res = await createLiveOrder(intent);
      if (res) {
        set({ managedOrders: { ...get().managedOrders, [res.id]: res } });
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
    const order = await cancelLimitOrder(id);
    if (!order) return false;
    set({ managedOrders: { ...get().managedOrders, [order.id]: order } });
    return true;
  },

  squareOff: async (symbol: string, reason = "MANUAL_SQUARE_OFF") => {
    const order = await squareOffLivePosition(symbol, reason);
    if (!order) return false;
    const current = { ...get().activePositions };
    delete current[symbol];
    const closed = await fetchClosedPositions();
    set({ managedOrders: { ...get().managedOrders, [order.id]: order }, activePositions: current, closedPositions: closed });
    return true;
  },

  updatePositionLevels: async (symbol: string, stopLossPrice?: number | null, targetPrice?: number | null) => {
    try {
      const pos = await updateLivePositionLevels(symbol, stopLossPrice, targetPrice);
      if (!pos) return false;
      set({ activePositions: { ...get().activePositions, [pos.symbol]: pos } });
      return true;
    } catch (err: any) {
      alert(`Update SL/TP Failed: ${err.message}`);
      return false;
    }
  },
}));
