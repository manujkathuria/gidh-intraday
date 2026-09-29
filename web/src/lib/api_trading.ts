import { getApiBase, getAuthHeader } from "./api_client";
import { ActivePosition, ClosedPosition, ManagedOrder, OrderIntent } from "./types_trading";

export async function fetchLivePositions(): Promise<ActivePosition[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/positions`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchLivePositions error:", err);
  }
  return [];
}

export async function fetchClosedPositions(date?: string): Promise<ClosedPosition[]> {
  try {
    const url = date ? `${getApiBase()}/api/trading/closed-positions?date=${encodeURIComponent(date)}` : `${getApiBase()}/api/trading/closed-positions`;
    const res = await fetch(url, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchClosedPositions error:", err);
  }
  return [];
}

export async function fetchManagedOrders(): Promise<ManagedOrder[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/orders`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchManagedOrders error:", err);
  }
  return [];
}

export async function createLiveOrder(intent: OrderIntent): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        client_order_id: intent.client_order_id ?? crypto.randomUUID(),
        symbol: intent.symbol,
        side: intent.side,
        order_type: intent.order_type,
        target_entry_price: intent.target_entry_price,
        margin_inr: intent.margin_inr ?? 10000,
        tactic: intent.tactic,
        invalidation: intent.invalidation ?? "15M_VWAP_CROSS",
      }),
    });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || "Order creation failed");
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to create live order:", err);
    throw err;
  }
}

export async function squareOffLivePosition(symbol: string, reason = "MANUAL_SQUARE_OFF"): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/positions/${encodeURIComponent(symbol)}/square-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to square off position:", err);
  }
  return null;
}

export async function updateLivePositionLevels(
  symbol: string,
  stopLossPrice?: number | null,
  targetPrice?: number | null
): Promise<ActivePosition | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/positions/${encodeURIComponent(symbol)}/levels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        stop_loss_price: stopLossPrice !== undefined && stopLossPrice !== null ? stopLossPrice : null,
        target_price: targetPrice !== undefined && targetPrice !== null ? targetPrice : null,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || "Update levels failed");
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to update position levels:", err);
    throw err;
  }
}

export async function cancelLimitOrder(id: string): Promise<ManagedOrder | null> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/orders/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to cancel order:", err);
  }
  return null;
}
