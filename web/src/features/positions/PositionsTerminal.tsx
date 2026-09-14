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
    orderTactic,
    setOrderTactic,
    submittingOrder,
    searchFilter,
    setSearchFilter,
    filteredSymbols,
    handleCreateOrder,
  } = usePositionsData();

  return (
    <div className="w-full px-6 py-5 flex-1 flex flex-col gap-5 max-w-7xl mx-auto">
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
      <div className="flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-foreground/70" />
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
            Active Trade Slots (5 Max)
          </h2>
        </div>

        <button
          onClick={() => setShowOrderModal(true)}
          disabled={availableSlots === 0}
          className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-black flex items-center gap-1.5 transition ${
            availableSlots > 0
              ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm cursor-pointer"
              : "bg-surface-muted text-foreground/30 border border-surface-border cursor-not-allowed"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Enter MIS Trade (₹10k Margin)</span>
        </button>
      </div>

      {/* 3. 5 Fixed Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 font-mono">
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

      {/* 4. Live Operating Brain Reference */}
      <BrainProtocolCard />

      {/* 5. Quick Order Modal */}
      <OrderDispatchModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        orderSide={orderSide}
        setOrderSide={setOrderSide}
        orderTactic={orderTactic}
        setOrderTactic={setOrderTactic}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        filteredSymbols={filteredSymbols}
        submittingOrder={submittingOrder}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};
