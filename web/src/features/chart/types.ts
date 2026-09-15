import { Candle } from "@/lib/api";
import { ChartInterval } from "./components/candleAggregator";

export interface StockSummaryItem {
  symbol: string;
  sector: string;
  move_pct: number;
  price: number;
  rvol: number;
  clv: number;
}

export interface ChartProps {
  candles: Candle[];
  symbol: string;
  theme?: "dark" | "light";
  height?: number;
  interval?: ChartInterval;
  selectedDate?: string;
}
