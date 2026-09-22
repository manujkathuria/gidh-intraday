import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMarketStore } from "@/stores/marketStore";
import { useLiveOrderStore } from "@/stores/liveOrderStore";
import { fetchMultiIntervalCandles, Candle, getStreamWsUrl, getStreamWsUrlWithAuth, OrderIntent } from "@/lib/api";
import { StockSummaryItem } from "../types";
import { ChartInterval } from "../components/candleAggregator";

export function useChartStudio() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get("symbol");

  const {
    sessions,
    selectedDate,
    snapshot,
    selectedSymbol,
    setSelectedSymbol,
    init,
  } = useMarketStore();

  const {
    activePositions,
    managedOrders,
    initLiveOrders,
    placeTrade,
    updatePositionLevels,
  } = useLiveOrderStore();

  const [activeSymbol, setActiveSymbol] = useState<string>(
    urlSymbol || selectedSymbol || "RELIANCE"
  );
  const [interval, setInterval] = useState<ChartInterval>("5m");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Chart Order Placement Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderSide, setOrderSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number>(0);

  // Active Position SL/TP Edit Mode State
  const [editingLevelType, setEditingLevelType] = useState<"SL" | "TP" | null>(null);
  const [draftLevelPrice, setDraftLevelPrice] = useState<number>(0);

  useEffect(() => {
    init();
    initLiveOrders();
  }, [init, initLiveOrders]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains("dark");
      setTheme(darkNow ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = urlSymbol || selectedSymbol;
    if (target) {
      if (target !== activeSymbol) {
        setActiveSymbol(target);
      }
      if (target !== selectedSymbol) {
        setSelectedSymbol(target);
      }
    }
  }, [urlSymbol, selectedSymbol, activeSymbol, setSelectedSymbol]);

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSelectedSymbol(sym);
    setIsOrderModalOpen(false);
    router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
  };

  useEffect(() => {
    if (!selectedDate || !activeSymbol) return;

    let isSubscribed = true;
    setLoadingCandles(true);

    fetchMultiIntervalCandles(activeSymbol, selectedDate, interval)
      .then((data) => {
        if (isSubscribed) {
          setChartCandles(data || []);
          setLoadingCandles(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching candles:", err);
        if (isSubscribed) setLoadingCandles(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedDate, activeSymbol, interval]);

  const stockInfo = useMemo(() => {
    return snapshot?.stocks?.find((s) => s.symbol === activeSymbol);
  }, [snapshot, activeSymbol]);

  const allSymbols: StockSummaryItem[] = useMemo(() => {
    if (!snapshot?.stocks) return [];
    return snapshot.stocks.map((s) => ({
      symbol: s.symbol,
      sector: s.sector,
      move_pct: s.move_pct,
      price: s.price,
      rvol: s.rvol,
      clv: s.clv,
    }));
  }, [snapshot]);

  const filteredSymbols = useMemo(() => {
    if (!searchTerm) return allSymbols;
    const lower = searchTerm.toLowerCase();
    return allSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(lower) ||
        s.sector.toLowerCase().includes(lower)
    );
  }, [allSymbols, searchTerm]);

  const activePosition = activePositions[activeSymbol];
  const pendingOrdersList = Object.values(managedOrders);
  const activePendingOrder = pendingOrdersList.find(
    (o) => o.symbol === activeSymbol && (o.status === "PENDING" || o.status === "TRIGGERING" || o.status === "SUBMITTED")
  );
  const lastClose = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].close : 0;
  const currentPrice = lastClose > 0 ? lastClose : (stockInfo?.price || 0);

  // Reset limitPrice when active symbol changes
  useEffect(() => {
    if (currentPrice > 0) {
      setLimitPrice(currentPrice);
    }
  }, [activeSymbol]); // only depend on activeSymbol so live 1Hz ticks don't overwrite user's dragged price

  // Connect on-demand 1Hz Chart WebSocket stream
  useEffect(() => {
    if (!activeSymbol) return;

    const latestDate = sessions[0];
    if (selectedDate && latestDate && selectedDate !== latestDate) {
      return;
    }

    let ws: WebSocket | null = null;
    let isMounted = true;

    async function connect() {
      try {
        const wsUrl = await getStreamWsUrlWithAuth(`/v1/stream/chart?symbol=${encodeURIComponent(activeSymbol)}`);
        if (!isMounted) return;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "SUBSCRIBE_SYMBOL", symbol: activeSymbol }));
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const tick = JSON.parse(event.data);
            if (tick && tick.symbol === activeSymbol && typeof tick.price === "number") {
              setChartCandles((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                const updated = {
                  ...last,
                  close: tick.price,
                  high: Math.max(last.high, tick.price),
                  low: Math.min(last.low, tick.price),
                  vwap: tick.vwap && tick.vwap > 0 ? tick.vwap : last.vwap,
                };
                return [...prev.slice(0, -1), updated];
              });
            }
          } catch {
            // ignore malformed tick
          }
        };
      } catch (e) {
        console.warn("WebSocket stream connection error:", e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, [activeSymbol, selectedDate, sessions]);

  // Active Position levels
  const entryPrice = activePosition ? activePosition.entry_price : undefined;
  const stopLossPrice = activePosition ? activePosition.stop_loss_price : undefined;
  const targetPrice = activePosition ? activePosition.target_price : undefined;

  // Open the modal and initialize Limit price at current LTP
  const handleOpenOrderModal = useCallback((side: "LONG" | "SHORT") => {
    setOrderSide(side);
    const initialPrice = currentPrice > 0
      ? (side === "LONG" ? Math.max(0.05, currentPrice - 0.10) : currentPrice + 0.10)
      : currentPrice;
    setLimitPrice(parseFloat(initialPrice.toFixed(2)));
    setIsOrderModalOpen(true);
  }, [currentPrice]);

  const handleCloseOrderModal = useCallback(() => {
    setIsOrderModalOpen(false);
  }, []);

  const dispatchOrder = useCallback(
    async (
      side: "LONG" | "SHORT",
      type: "MARKET" | "LIMIT" = "MARKET",
      customLimitPrice?: number,
      customMarginInr?: number
    ): Promise<boolean> => {
      let targetEntryPrice = type === "LIMIT" && customLimitPrice && customLimitPrice > 0 ? customLimitPrice : (type === "LIMIT" ? limitPrice : undefined);
      if (type === "LIMIT" && targetEntryPrice && targetEntryPrice > 0 && currentPrice > 0) {
        if (side === "LONG") {
          targetEntryPrice = Math.min(targetEntryPrice, currentPrice);
        } else if (side === "SHORT") {
          targetEntryPrice = Math.max(targetEntryPrice, currentPrice);
        }
      }

      const intent: OrderIntent = {
        symbol: activeSymbol,
        side: side,
        order_type: type,
        margin_inr: customMarginInr && customMarginInr > 0 ? customMarginInr : 10000,
        target_entry_price: targetEntryPrice,
        tactic: "CHART_INSTANT",
        invalidation: "15M_VWAP_CROSS",
      };

      return await placeTrade(intent);
    },
    [activeSymbol, currentPrice, limitPrice, placeTrade]
  );

  return {
    activeSymbol,
    handleSelectSymbol,
    interval,
    setInterval,
    searchTerm,
    setSearchTerm,
    chartCandles,
    loadingCandles,
    theme,
    selectedDate,
    currentTimeMinutes: 930,
    stockInfo,
    currentPrice,
    allSymbols,
    filteredSymbols,
    mode: "COMPLETED",
    // Position levels
    entryPrice,
    stopLossPrice,
    targetPrice,
    hasActivePosition: !!activePosition,
    positionSide: (activePosition?.side as "LONG" | "SHORT") || "LONG",
    updatePositionLevels,
    editingLevelType,
    setEditingLevelType,
    draftLevelPrice,
    setDraftLevelPrice,
    // Pending Order on Symbol
    activePendingOrder,
    // Order Modal & Limit Slider
    isOrderModalOpen,
    orderSide,
    setOrderSide,
    orderType,
    setOrderType,
    limitPrice: limitPrice || currentPrice,
    setLimitPrice,
    handleOpenOrderModal,
    handleCloseOrderModal,
    dispatchOrder,
  };
}
