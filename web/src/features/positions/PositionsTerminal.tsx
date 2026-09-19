"use client";

import React from "react";
import { Zap, Plus } from "lucide-react";
import { HeroStatsMatrix } from "./components/HeroStatsMatrix";
import { ActivePositionCard } from "./components/ActivePositionCard";
import { EmptySlotCard } from "./components/EmptySlotCard";
import { OrderDispatchModal } from "./components/OrderDispatchModal";
import { BrainProtocolCard } from "./components/BrainProtocolCard";
import { usePositionsData } from "./hooks/usePositionsData";

export const PositionsTerminal: React.FC = () => {
  const {
    positionsList,
    usedSlots,
    availableSlots,
    totalPnLINR,
    totalMarginUsed,
    totalCapitalPool,
    totalGrossExposure,
    isConnected,
    initLiveOrders,
    squareOff,
    showOrderModal,
    setShowOrderModal,
    selectedSymbol,
    setSelectedSymbol,
    orderSide,
    setOrderSide,
    orderType,
    setOrderType,
    targetEntryPrice,
    setTargetEntryPrice,
    stopLossPrice,
    setStopLossPrice,
    targetPrice,
    setTargetPrice,
    orderTactic,
    setOrderTactic,
    submittingOrder,
    searchFilter,
    setSearchFilter,
    filteredSymbols,
    handleCreateOrder,
  } = usePositionsData();

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Hero Stats Matrix */}
      <HeroStatsMatrix
        totalPnLINR={totalPnLINR}
        usedSlots={usedSlots}
        totalMarginUsed={totalMarginUsed}
        totalCapitalPool={totalCapitalPool}
        availableSlots={availableSlots}
        totalGrossExposure={totalGrossExposure}
        isConnected={isConnected}
        onRefresh={initLiveOrders}
      />

      {/* 2. Section Header & Order Action Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-foreground/60" />
          <h2 className="text-xs  font-bold uppercase tracking-wider text-foreground">
            5-Slot Trade Matrix
          </h2>
          <span className="text-[10px]  px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/60">
            {usedSlots}/5 ACTIVE
          </span>
        </div>

        <button
          onClick={() => setShowOrderModal(true)}
          disabled={availableSlots === 0}
          className={`px-3 py-1.5 rounded-lg text-xs  font-bold flex items-center gap-1.5 transition ${availableSlots > 0
              ? "bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
              : "bg-surface-muted text-foreground/30 border border-surface-border cursor-not-allowed"
            }`}
        >
          <Plus className="w-3 h-3" />
          <span>New Order</span>
        </button>
      </div>

      {/* 3. 5 Fixed Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, slotIndex) => {
          const pos = positionsList[slotIndex];
          if (pos) {
            return (
              <ActivePositionCard
                key={pos.symbol}
                pos={pos}
                slotIndex={slotIndex}
                onSquareOff={squareOff}
              />
            );
          }
          return (
            <EmptySlotCard
              key={`empty-slot-${slotIndex}`}
              slotIndex={slotIndex}
              onEnterTrade={() => setShowOrderModal(true)}
            />
          );
        })}
      </div>

      {/* 4. Live Operating Brain Reference (Collapsible) */}
      <BrainProtocolCard />

      {/* 5. Quick Order Modal */}
      <OrderDispatchModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        orderSide={orderSide}
        setOrderSide={setOrderSide}
        orderType={orderType}
        setOrderType={setOrderType}
        targetEntryPrice={targetEntryPrice}
        setTargetEntryPrice={setTargetEntryPrice}
        stopLossPrice={stopLossPrice}
        setStopLossPrice={setStopLossPrice}
        targetPrice={targetPrice}
        setTargetPrice={setTargetPrice}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        filteredSymbols={filteredSymbols}
        submittingOrder={submittingOrder}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};
