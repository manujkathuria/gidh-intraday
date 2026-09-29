import { auth } from "@/lib/firebase";
import { handleLiveOrderWsEvent } from "./liveOrderWsHandler";

const getLiveWsUrl = () => {
  if (process.env.NEXT_PUBLIC_LIVE_WS_URL) return process.env.NEXT_PUBLIC_LIVE_WS_URL;
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "ws://127.0.0.1:8080/v1/live/orders/ws";
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/v1/live/orders/ws`;
  }
  return "ws://127.0.0.1:8080/v1/live/orders/ws";
};

export async function connectLiveWebSocket(get: () => any, set: (partial: any) => void) {
  const existingWs = get().ws;
  if (existingWs && existingWs.readyState === WebSocket.OPEN) return;

  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const baseUrl = getLiveWsUrl();
    const socket = new WebSocket(token ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}auth=${encodeURIComponent(token)}` : baseUrl);

    socket.onopen = () => set({ isConnected: true, ws: socket });
    socket.onmessage = (event) => {
      try {
        const ev = JSON.parse(event.data);
        handleLiveOrderWsEvent(ev, get, set);
      } catch (err) {
        console.error("[LIVE WS] Message parse error:", err);
      }
    };
    socket.onclose = () => {
      set({ isConnected: false, ws: null });
      setTimeout(() => get().connectLiveWebSocket(), 3000);
    };
    socket.onerror = (err) => console.error("[LIVE WS] Error:", err);
  } catch (err) {
    console.error("[LIVE WS] Init error:", err);
  }
}
