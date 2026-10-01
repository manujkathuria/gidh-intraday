import { Candle } from "@/lib/api";
import { MacroLevelsData } from "@/lib/api_quant";
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
  currentLtp?: number;
  entryPrice?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  macroLevels?: MacroLevelsData | null;
  // Interactive Limit Order Slider

  limitPrice?: number;
  isLimitDraggable?: boolean;
  onLimitPriceChange?: (price: number) => void;
  orderSide?: "LONG" | "SHORT";
  orderType?: "MARKET" | "LIMIT";
  hasActivePosition?: boolean;
  positionSide?: "LONG" | "SHORT";
  editingLevelType?: "SL" | "TP" | null;
  draftLevelPrice?: number;
  onDraftLevelPriceChange?: (price: number) => void;
  onUpdateLevels?: (symbol: string, sl?: number | null, tp?: number | null) => Promise<boolean>;
}


