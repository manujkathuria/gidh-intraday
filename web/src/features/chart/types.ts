import { Candle } from "@/lib/api";

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
}
