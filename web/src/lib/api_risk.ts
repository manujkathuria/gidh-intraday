import { getApiBase, getAuthHeader } from "./api_client";
import { RiskState } from "./types_trading";

export async function fetchRiskState(): Promise<RiskState> {
  try {
    const res = await fetch(`${getApiBase()}/api/trading/risk-state`, {
      headers: await getAuthHeader(),
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[REST] fetchRiskState error:", err);
  }
  return { kill_switch: false, circuit_broken: false };
}

export async function resetTripwire(): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${getApiBase()}/api/trading/risk-state/reset`, {
      method: "POST",
      headers: authHeaders,
    });
    return res.ok;
  } catch (err) {
    console.error("[REST] resetTripwire error:", err);
    return false;
  }
}
