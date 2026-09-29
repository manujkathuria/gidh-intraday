import { useEffect, useRef, useState, useCallback } from "react";
import { ISeriesApi } from "lightweight-charts";
import { Candle } from "@/lib/api";

export function useChartDraggableLines({
  candleSeriesRef,
  chartContainerRef,
  limitPrice,
  orderType,
  orderSide,
  isLimitDraggable,
  onLimitPriceChange,
  editingLevelType,
  draftLevelPrice,
  onDraftLevelPriceChange,
  currentLtp,
  candles,
}: {
  candleSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  chartContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  limitPrice?: number;
  orderType: "MARKET" | "LIMIT";
  orderSide: "LONG" | "SHORT";
  isLimitDraggable: boolean;
  onLimitPriceChange?: (price: number) => void;
  editingLevelType: "SL" | "TP" | null;
  draftLevelPrice: number;
  onDraftLevelPriceChange?: (price: number) => void;
  currentLtp?: number;
  candles?: Candle[];
}) {
  const [dragLimitY, setDragLimitY] = useState<number | null>(null);
  const [dragLevelY, setDragLevelY] = useState<number | null>(null);
  const activeDragRef = useRef<"LIMIT" | "LEVEL" | null>(null);

  const updateCoordinates = useCallback(() => {
    if (!candleSeriesRef.current) {
      setDragLimitY(null);
      setDragLevelY(null);
      return;
    }
    if (limitPrice && limitPrice > 0 && orderType === "LIMIT" && isLimitDraggable) {
      const y = candleSeriesRef.current.priceToCoordinate(limitPrice);
      setDragLimitY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragLimitY(null);
    }
    if (editingLevelType && draftLevelPrice > 0) {
      const y = candleSeriesRef.current.priceToCoordinate(draftLevelPrice);
      setDragLevelY(y !== null && !isNaN(y) ? y : null);
    } else {
      setDragLevelY(null);
    }
  }, [candleSeriesRef, limitPrice, orderType, isLimitDraggable, editingLevelType, draftLevelPrice]);

  useEffect(() => {
    updateCoordinates();
  }, [candles, updateCoordinates]);

  const handleLimitMouseDown = (e: React.MouseEvent) => {
    if (!isLimitDraggable || orderType !== "LIMIT") return;
    activeDragRef.current = "LIMIT";
    e.preventDefault();
  };

  const handleLevelMouseDown = (e: React.MouseEvent) => {
    if (!editingLevelType) return;
    activeDragRef.current = "LEVEL";
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDragRef.current || !chartContainerRef.current || !candleSeriesRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const clientY = e.clientY - rect.top;
      const price = candleSeriesRef.current.coordinateToPrice(clientY);
      if (price === null || isNaN(price) || price <= 0) return;

      const roundedPrice = parseFloat((Math.round(price / 0.05) * 0.05).toFixed(2));
      const ltp = currentLtp || (candles && candles.length > 0 ? candles[candles.length - 1].close : 0);

      if (activeDragRef.current === "LIMIT") {
        let finalPrice = roundedPrice;
        if (ltp > 0) {
          if (orderSide === "LONG") finalPrice = Math.min(roundedPrice, ltp);
          else if (orderSide === "SHORT") finalPrice = Math.max(roundedPrice, ltp);
        }
        if (onLimitPriceChange) onLimitPriceChange(finalPrice);
      } else if (activeDragRef.current === "LEVEL") {
        if (onDraftLevelPriceChange) onDraftLevelPriceChange(roundedPrice);
      }
    };

    const handleMouseUp = () => {
      activeDragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [chartContainerRef, candleSeriesRef, isLimitDraggable, onLimitPriceChange, currentLtp, orderSide, candles, editingLevelType, onDraftLevelPriceChange]);

  return { dragLimitY, dragLevelY, handleLimitMouseDown, handleLevelMouseDown };
}
