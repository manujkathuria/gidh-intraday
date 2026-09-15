import { ColorType } from "lightweight-charts";
import { ChartInterval } from "./candleAggregator";

export function getChartOptions(
  isDark: boolean,
  interval: ChartInterval = "1m",
  width?: number,
  height?: number
) {
  const options: any = {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: isDark ? "#A1A1AA" : "#71717A",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { visible: false },
    },
    timeScale: {
      timeVisible: interval !== "1d",
      secondsVisible: false,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      rightOffset: 12,
      barSpacing: interval === "1d" ? 8 : 6,
      minBarSpacing: 2,
      tickMarkFormatter: (t: number) => {
        const d = new Date((t + 19800) * 1000);
        if (interval === "1d") {
          const day = String(d.getUTCDate()).padStart(2, "0");
          const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          return `${day} ${month}`;
        }
        if (interval === "1h") {
          const day = String(d.getUTCDate()).padStart(2, "0");
          const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          const hours = String(d.getUTCHours()).padStart(2, "0");
          const mins = String(d.getUTCMinutes()).padStart(2, "0");
          return `${day} ${month} ${hours}:${mins}`;
        }
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      },
    },
    localization: {
      timeFormatter: (t: number) => {
        const d = new Date((t + 19800) * 1000);
        if (interval === "1d") {
          const day = String(d.getUTCDate()).padStart(2, "0");
          const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          const year = d.getUTCFullYear();
          return `${day} ${month} ${year}`;
        }
        if (interval === "1h") {
          const day = String(d.getUTCDate()).padStart(2, "0");
          const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          const hours = String(d.getUTCHours()).padStart(2, "0");
          const mins = String(d.getUTCMinutes()).padStart(2, "0");
          return `${day} ${month} ${hours}:${mins} IST`;
        }
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} IST`;
      },
    },
    rightPriceScale: {
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      autoScale: true,
    },
    crosshair: {
      vertLine: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" },
      horzLine: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" },
    },
  };

  if (width !== undefined) options.width = width;
  if (height !== undefined) options.height = height;

  return options;
}

export const CANDLE_COLORS = {
  dark: {
    upColor: "#10B981",
    downColor: "#EF4444",
    borderUpColor: "#10B981",
    borderDownColor: "#EF4444",
    wickUpColor: "#10B981",
    wickDownColor: "#EF4444",
    vwapColor: "#A855F7",
  },
  light: {
    upColor: "#059669",
    downColor: "#DC2626",
    borderUpColor: "#059669",
    borderDownColor: "#DC2626",
    wickUpColor: "#059669",
    wickDownColor: "#DC2626",
    vwapColor: "#7E22CE",
  },
};
