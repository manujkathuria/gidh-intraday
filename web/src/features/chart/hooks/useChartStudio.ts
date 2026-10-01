import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMarketStore } from "@/stores/marketStore";
import { useLiveOrderStore } from "@/stores/liveOrderStore";
import { OrderIntent } from "@/lib/api";
import { MacroLevelsData, fetchMacroLevels } from "@/lib/api_quant";
import { StockSummaryItem } from "../types";
import { ChartInterval } from "../components/candleAggregator";
import { useChartCandlesStream } from "./useChartCandlesStream";
import { useThemeObserver } from "./useThemeObserver";

export function useChartStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const { sessions, selectedDate, snapshot, selectedSymbol, setSelectedSymbol, init } = useMarketStore();
  const { activePositions, managedOrders, initLiveOrders, placeTrade, updatePositionLevels } = useLiveOrderStore();

  const [activeSymbol, setActiveSymbol] = useState<string>(urlSymbol || selectedSymbol || "RELIANCE");
  const [interval, setIntervalState] = useState<ChartInterval>("1d");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const theme = useThemeObserver();

  const setInterval = (newInterval: ChartInterval) => {
    setIntervalState(newInterval);
    useMarketStore.getState().setSelectedInterval(newInterval);
  };

  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderSide, setOrderSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(0);

  const [editingLevelType, setEditingLevelType] = useState<"SL" | "TP" | null>(null);
  const [draftLevelPrice, setDraftLevelPrice] = useState<number>(0);

  useEffect(() => {
    init();
    initLiveOrders();
  }, [init, initLiveOrders]);

  useEffect(() => {
    const target = urlSymbol || selectedSymbol;
    if (target) {
      if (target !== activeSymbol) setActiveSymbol(target);
      if (target !== selectedSymbol) setSelectedSymbol(target);
    }
  }, [urlSymbol, selectedSymbol, activeSymbol, setSelectedSymbol]);

  const { chartCandles, loadingCandles } = useChartCandlesStream(activeSymbol, selectedDate, interval, sessions);


  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSelectedSymbol(sym);
    setIsOrderModalOpen(false);
    router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
  };

  const stockInfo = useMemo(() => snapshot?.stocks?.find((s) => s.symbol === activeSymbol), [snapshot, activeSymbol]);
  const allSymbols: StockSummaryItem[] = useMemo(() => {
    if (!snapshot?.stocks) return [];
    return snapshot.stocks.map((s) => ({
      symbol: s.symbol, sector: s.sector, move_pct: s.move_pct, price: s.price, rvol: s.rvol, clv: s.clv,
    }));
  }, [snapshot]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return allSymbols;
    const lower = searchTerm.toLowerCase();
    return allSymbols.filter((s) => s.symbol.toLowerCase().includes(lower) || s.sector.toLowerCase().includes(lower));
  }, [allSymbols, searchTerm]);

  const activePosition = activePositions[activeSymbol];
  const pendingOrdersList = Object.values(managedOrders);
  const activePendingOrder = pendingOrdersList.find(
    (o) => o.symbol === activeSymbol && (o.status === "PENDING" || o.status === "TRIGGERING" || o.status === "SUBMITTED")
  );
  const lastClose = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].close : 0;
  const currentPrice = lastClose > 0 ? lastClose : (stockInfo?.price || 0);

  useEffect(() => {
    if (currentPrice > 0) setLimitPrice(currentPrice);
  }, [activeSymbol]);

  const handleOpenOrderModal = useCallback((side: "LONG" | "SHORT") => {
    setOrderSide(side);
    const initialPrice = currentPrice > 0
      ? (side === "LONG" ? Math.max(0.05, currentPrice - 0.10) : currentPrice + 0.10)
      : currentPrice;
    setLimitPrice(parseFloat(initialPrice.toFixed(2)));
    setIsOrderModalOpen(true);
  }, [currentPrice]);

  const handleCloseOrderModal = useCallback(() => setIsOrderModalOpen(false), []);

  const dispatchOrder = useCallback(
    async (side: "LONG" | "SHORT", type: "MARKET" | "LIMIT" = "MARKET", customLimitPrice?: number, customMarginInr?: number): Promise<boolean> => {
      let targetEntryPrice = type === "LIMIT" && customLimitPrice && customLimitPrice > 0 ? customLimitPrice : (type === "LIMIT" ? limitPrice : undefined);
      if (type === "LIMIT" && targetEntryPrice && targetEntryPrice > 0 && currentPrice > 0) {
        if (side === "LONG") targetEntryPrice = Math.min(targetEntryPrice, currentPrice);
        else if (side === "SHORT") targetEntryPrice = Math.max(targetEntryPrice, currentPrice);
      }
      const intent: OrderIntent = {
        symbol: activeSymbol, side, order_type: type,
        margin_inr: customMarginInr && customMarginInr > 0 ? customMarginInr : 10000,
        target_entry_price: targetEntryPrice, tactic: "CHART_INSTANT", invalidation: "15M_VWAP_CROSS",
      };
      return await placeTrade(intent);
    },
    [activeSymbol, currentPrice, limitPrice, placeTrade]
  );

  const [macroLevels, setMacroLevels] = useState<MacroLevelsData | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function loadLevels() {
      if (!activeSymbol || !selectedDate) {
        setMacroLevels(null);
        return;
      }
      const data = await fetchMacroLevels(activeSymbol, selectedDate);
      if (!isCancelled) {
        setMacroLevels(data);
      }
    }
    loadLevels();
    return () => {
      isCancelled = true;
    };
  }, [activeSymbol, selectedDate]);

  return {
    activeSymbol, handleSelectSymbol, interval, setInterval, searchTerm, setSearchTerm, chartCandles, loadingCandles,
    theme, selectedDate, currentTimeMinutes: 930, stockInfo, currentPrice, allSymbols, filteredSymbols, mode: "COMPLETED",
    entryPrice: activePosition?.entry_price, stopLossPrice: activePosition?.stop_loss_price, targetPrice: activePosition?.target_price,
    hasActivePosition: !!activePosition, positionSide: (activePosition?.side as "LONG" | "SHORT") || "LONG", updatePositionLevels,
    editingLevelType, setEditingLevelType, draftLevelPrice, setDraftLevelPrice, activePendingOrder, isOrderModalOpen, orderSide,
    setOrderSide, orderType, setOrderType, limitPrice: limitPrice || currentPrice, setLimitPrice, handleOpenOrderModal,
    handleCloseOrderModal, dispatchOrder, macroLevels,
  };
}


