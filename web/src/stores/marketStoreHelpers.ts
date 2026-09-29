import {
  fetchSessions,
  fetchMarketSnapshot,
  fetchMultiIntervalCandles,
  fetchMarketStatus,
  ReplaySnapshot,
} from "@/lib/api";

export async function initMarketState(get: () => any, set: (partial: any) => void) {
  try {
    const status = await fetchMarketStatus();
    set({ isLive: status.isLive });
  } catch {
    // ignore
  }

  const currentDate = get().selectedDate;
  try {
    set({ loading: !currentDate });
    const sessions = await fetchSessions();
    if (sessions.length === 0) {
      set({ error: "No market sessions available.", loading: false });
      return;
    }

    const activeDate = currentDate && sessions.includes(currentDate) ? currentDate : sessions[0];
    set({ sessions, selectedDate: activeDate });

    if (get().snapshot?.session_date === activeDate && (get().snapshot?.stocks?.length || 0) > 0) {
      set({ loading: false });
      return;
    }

    const snap = await fetchMarketSnapshot(activeDate);
    if (snap) {
      set({
        snapshot: snap,
        sectors: snap.sectors || [],
        traps: snap.traps || [],
        loading: false,
        error: null,
      });
    }

    const { selectedSymbol, selectedInterval } = get();
    const candles = await fetchMultiIntervalCandles(selectedSymbol, activeDate, selectedInterval);
    set({ candles, loading: false });
  } catch (err: any) {
    set({ error: err.message || "Failed to initialize market store", loading: false });
  }
}

export function mergeLiveSnapshot(prev: ReplaySnapshot | null, data: Partial<ReplaySnapshot>): ReplaySnapshot {
  if (!prev) return data as ReplaySnapshot;
  return {
    ...prev,
    ...data,
    stocks: data.stocks || prev.stocks,
    sectors: data.sectors || prev.sectors,
    traps: data.traps || prev.traps,
    weather: data.weather || prev.weather,
  };
}
