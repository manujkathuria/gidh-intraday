import { useEffect, useState, useMemo } from "react";
import { useLiveOrderStore } from "@/stores/liveOrderStore";
import { useMarketData } from "@/stores/useMarketData";
import { ActivePosition, OrderIntent } from "@/lib/api";

export function usePositionsData() {
  const {
    activePositions,
    isConnected,
    loading,
    initLiveOrders,
    placeTrade,
    squareOff,
  } = useLiveOrderStore();

  const { snapshot, init } = useMarketData();

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [orderSide, setOrderSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderTactic, setOrderTactic] = useState("15M ORB BREAKOUT");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    init();
    initLiveOrders();
  }, [init, initLiveOrders]);

  const positionsList: ActivePosition[] = Object.values(activePositions);
  const totalSlots = 5;
  const usedSlots = positionsList.length;
  const availableSlots = Math.max(0, totalSlots - usedSlots);

  const totalPnLINR = positionsList.reduce((acc, p) => acc + p.pnl_inr, 0);
  const totalMarginUsed = usedSlots * 10000;
  const totalCapitalPool = 50000;
  const totalGrossExposure = totalMarginUsed * 5;

  const fnoStocks = snapshot?.stocks || [];

  const availableSymbols = useMemo(() => {
    return fnoStocks
      .filter((s) => !activePositions[s.symbol])
      .map((s) => ({
        symbol: s.symbol,
        price: s.price,
        move_pct: s.move_pct,
        rvol: s.rvol,
        sector: s.sector,
        is_above_vwap: s.is_above_vwap,
      }));
  }, [fnoStocks, activePositions]);

  const filteredSymbols = useMemo(() => {
    if (!searchFilter) return availableSymbols.slice(0, 30);
    const query = searchFilter.toLowerCase();
    return availableSymbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.sector.toLowerCase().includes(query)
    );
  }, [availableSymbols, searchFilter]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol) {
      alert("Please select a stock symbol.");
      return;
    }
    setSubmittingOrder(true);
    const intent: OrderIntent = {
      symbol: selectedSymbol,
      side: orderSide,
      margin_inr: 10000,
      tactic: orderTactic,
      invalidation: "15M_VWAP_CROSS",
    };

    const success = await placeTrade(intent);
    setSubmittingOrder(false);
    if (success) {
      setShowOrderModal(false);
      setSelectedSymbol("");
      setSearchFilter("");
    }
  };

  return {
    positionsList,
    totalSlots,
    usedSlots,
    availableSlots,
    totalPnLINR,
    totalMarginUsed,
    totalCapitalPool,
    totalGrossExposure,
    isConnected,
    loading,
    initLiveOrders,
    squareOff,
    showOrderModal,
    setShowOrderModal,
    selectedSymbol,
    setSelectedSymbol,
    orderSide,
    setOrderSide,
    orderTactic,
    setOrderTactic,
    submittingOrder,
    searchFilter,
    setSearchFilter,
    filteredSymbols,
    handleCreateOrder,
  };
}
