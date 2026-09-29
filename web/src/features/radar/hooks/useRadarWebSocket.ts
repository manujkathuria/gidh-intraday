import { useEffect } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { getStreamWsUrlWithAuth } from "@/lib/api";

export function useRadarWebSocket() {
  const { setWsConnected, applyLiveSnapshot } = useMarketStore();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    async function connect() {
      try {
        const url = await getStreamWsUrlWithAuth("/v1/stream/radar");
        if (!isMounted) return;
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (isMounted) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && (data.stocks || data.weather || data.sectors)) {
              applyLiveSnapshot(data);
            }
          } catch {
            // ignore non-json messages
          }
        };

        ws.onclose = () => {
          if (isMounted) setWsConnected(false);
        };

        ws.onerror = () => {
          if (isMounted) setWsConnected(false);
        };
      } catch (e) {
        console.warn("[Radar WS] connection failed:", e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      setWsConnected(false);
    };
  }, [setWsConnected, applyLiveSnapshot]);
}
