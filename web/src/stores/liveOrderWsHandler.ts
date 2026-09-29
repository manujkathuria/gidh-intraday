import { ActivePosition, ClosedPosition, ManagedOrder, RiskState } from "@/lib/types_trading";

export function handleLiveOrderWsEvent(
  ev: any,
  get: () => {
    activePositions: Record<string, ActivePosition>;
    managedOrders: Record<string, ManagedOrder>;
    closedPositions: ClosedPosition[];
  },
  set: (partial: any) => void
) {
  const current = { ...get().activePositions };
  const orders = { ...get().managedOrders };

  if (ev.type === "INITIAL_STATE" && ev.payload) {
    const initialPositions: Record<string, ActivePosition> = {};
    for (const pos of ev.payload.positions || []) initialPositions[pos.symbol] = pos;
    const initialOrders: Record<string, ManagedOrder> = {};
    for (const order of ev.payload.orders || []) initialOrders[order.id] = order;
    set({ activePositions: initialPositions, managedOrders: initialOrders });
  } else if ((ev.type === "POSITION_UPDATED" || ev.type === "POSITION_OPENED") && ev.payload) {
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
}
