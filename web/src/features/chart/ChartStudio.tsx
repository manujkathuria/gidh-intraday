"use client";

import React from "react";
import { Activity } from "lucide-react";
import { StockHeaderMetrics } from "./components/StockHeaderMetrics";
import { CandlestickCanvas } from "./components/CandlestickCanvas";
import { ChartOrderModal } from "./components/ChartOrderModal";
import { useChartStudio } from "./hooks/useChartStudio";

export const ChartStudio: React.FC = () => {
  const {
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
    currentTimeMinutes,
    stockInfo,
    currentPrice,
    allSymbols,
    filteredSymbols,
    mode,
    entryPrice,
    stopLossPrice,
    targetPrice,
    hasActivePosition,
    positionSide,
    updatePositionLevels,
    editingLevelType,
    setEditingLevelType,
    draftLevelPrice,
    setDraftLevelPrice,
    activePendingOrder,
    // Order Modal & Limit Dragging
    isOrderModalOpen,
    orderSide,
    setOrderSide,
    orderType,
    setOrderType,
    limitPrice,
    setLimitPrice,
    handleOpenOrderModal,
    handleCloseOrderModal,
    dispatchOrder,
  } = useChartStudio();

  const lastClose = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].close : 0;
  const lastVwap = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].vwap : 0;

  const displayLimitPrice = isOrderModalOpen && orderType === "LIMIT"
    ? limitPrice
    : (activePendingOrder?.limit_price ? activePendingOrder.limit_price : undefined);

  const displayOrderSide = isOrderModalOpen
    ? orderSide
    : (activePendingOrder?.side || orderSide);

  const displayOrderType = isOrderModalOpen
    ? orderType
    : (activePendingOrder ? "LIMIT" : orderType);

  return (
    <div className="flex-1 w-full flex flex-col gap-2 min-h-0 overflow-hidden relative">
      {/* 1. Header Metrics with Stock Search Combobox, Intervals & LONG / SHRT / SL / TP buttons */}
      <StockHeaderMetrics
        activeSymbol={activeSymbol}
        stockInfo={stockInfo}
        currentTimeMinutes={currentTimeMinutes}
        candlesCount={chartCandles.length}
        lastClosePrice={lastClose}
        lastVwap={lastVwap}
        allSymbols={allSymbols}
        onSelectSymbol={handleSelectSymbol}
        interval={interval}
        onChangeInterval={setInterval}
        onOpenOrderModal={handleOpenOrderModal}
        isOrderModalOpen={isOrderModalOpen}
        activeOrderSide={orderSide}
        hasActivePosition={hasActivePosition}
        positionSide={positionSide}
        entryPrice={entryPrice}
        stopLossPrice={stopLossPrice}
        targetPrice={targetPrice}
        editingLevelType={editingLevelType}
        onSetEditingLevelType={setEditingLevelType}
        draftLevelPrice={draftLevelPrice}
        onDraftLevelPriceChange={setDraftLevelPrice}
        onUpdateLevels={updatePositionLevels}
      />

      {/* 2. Edge-to-Edge Candlestick Studio with Entry, SL, TP, and Interactive Draggable Limit Lines */}
      <div className="flex-1 w-full bg-surface border border-surface-border rounded-lg p-2 flex flex-col min-h-0 relative overflow-hidden">
        {loadingCandles && (
          <div className="absolute top-3 right-3 z-20 bg-surface/90 border border-surface-border px-3 py-1.5 rounded text-xs text-foreground/70 flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <Activity className="w-3.5 h-3.5 animate-spin text-foreground" />
            Syncing 1m stream...
          </div>
        )}

        {/* 3. Connected Floating Chart Order Modal */}
        <ChartOrderModal
          isOpen={isOrderModalOpen}
          onClose={handleCloseOrderModal}
          symbol={activeSymbol}
          currentPrice={currentPrice}
          orderSide={orderSide}
          orderType={orderType}
          setOrderType={setOrderType}
          limitPrice={limitPrice}
          setLimitPrice={setLimitPrice}
          onDispatchOrder={dispatchOrder}
        />

        <div className="flex-1 w-full h-full min-h-0">
          <CandlestickCanvas
            candles={chartCandles}
            symbol={activeSymbol}
            theme={theme}
            interval={interval}
            selectedDate={selectedDate}
            currentLtp={currentPrice}
            entryPrice={entryPrice}
            stopLossPrice={stopLossPrice}
            targetPrice={targetPrice}
            limitPrice={displayLimitPrice}
            isLimitDraggable={isOrderModalOpen && orderType === "LIMIT"}
            onLimitPriceChange={setLimitPrice}
            orderSide={displayOrderSide}
            orderType={displayOrderType}
            hasActivePosition={hasActivePosition}
            positionSide={positionSide}
            editingLevelType={editingLevelType}
            draftLevelPrice={draftLevelPrice}
            onDraftLevelPriceChange={setDraftLevelPrice}
            onUpdateLevels={updatePositionLevels}
          />
        </div>
      </div>
    </div>
  );
};
