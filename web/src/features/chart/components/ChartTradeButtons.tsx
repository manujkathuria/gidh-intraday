"use client";

import React from "react";
import { LevelAdjustmentPopover } from "./LevelAdjustmentPopover";
import { PositionLevelButtons } from "./PositionLevelButtons";

interface Props {
  symbol: string;
  onOpenOrderModal: (side: "LONG" | "SHORT") => void;
  isOrderModalOpen?: boolean;
  activeOrderSide?: "LONG" | "SHORT";
  hasActivePosition?: boolean;
  positionSide?: "LONG" | "SHORT";
  entryPrice?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  editingLevelType?: "SL" | "TP" | null;
  onSetEditingLevelType?: (type: "SL" | "TP" | null) => void;
  draftLevelPrice?: number;
  onDraftLevelPriceChange?: (price: number) => void;
  onUpdateLevels?: (symbol: string, sl?: number | null, tp?: number | null) => Promise<boolean>;
}

export const ChartTradeButtons: React.FC<Props> = ({
  symbol,
  onOpenOrderModal,
  isOrderModalOpen = false,
  activeOrderSide,
  hasActivePosition = false,
  positionSide = "LONG",
  entryPrice,
  stopLossPrice,
  targetPrice,
  editingLevelType = null,
  onSetEditingLevelType,
  draftLevelPrice = 0,
  onDraftLevelPriceChange,
  onUpdateLevels,
}) => {
  const handleOpenEdit = (type: "SL" | "TP") => {
    if (editingLevelType === type) {
      onSetEditingLevelType?.(null);
      return;
    }
    onSetEditingLevelType?.(type);

    let initialPrice = 0;
    if (type === "SL") {
      initialPrice = stopLossPrice && stopLossPrice > 0
        ? stopLossPrice
        : (entryPrice ? (positionSide === "LONG" ? entryPrice * 0.99 : entryPrice * 1.01) : 0);
    } else {
      initialPrice = targetPrice && targetPrice > 0
        ? targetPrice
        : (entryPrice ? (positionSide === "LONG" ? entryPrice * 1.02 : entryPrice * 0.98) : 0);
    }
    if (initialPrice > 0) onDraftLevelPriceChange?.(parseFloat(initialPrice.toFixed(2)));
  };

  const handleSave = async () => {
    if (!onUpdateLevels) return;
    const priceToSave = draftLevelPrice > 0 ? draftLevelPrice : null;
    if (editingLevelType === "SL") await onUpdateLevels(symbol, priceToSave, undefined);
    else if (editingLevelType === "TP") await onUpdateLevels(symbol, undefined, priceToSave);
    onSetEditingLevelType?.(null);
  };

  const handleClear = async () => {
    if (!onUpdateLevels) return;
    if (editingLevelType === "SL") await onUpdateLevels(symbol, null, undefined);
    else if (editingLevelType === "TP") await onUpdateLevels(symbol, undefined, null);
    onSetEditingLevelType?.(null);
  };

  const hasSL = typeof stopLossPrice === "number" && stopLossPrice > 0;
  const hasTP = typeof targetPrice === "number" && targetPrice > 0;

  return (
    <div className="relative flex items-center gap-1.5 text-xs select-none">
      <button
        type="button"
        onClick={() => {
          onSetEditingLevelType?.(null);
          onOpenOrderModal("LONG");
        }}
        className={`h-7 px-2.5 rounded font-black text-xs flex items-center gap-1 transition cursor-pointer border ${
          isOrderModalOpen && activeOrderSide === "LONG"
            ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
            : "bg-surface border-surface-border text-foreground/80 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-surface-hover"
        }`}
        title="Open LONG Order Panel (₹10k Slot)"
      >
        <span>LONG</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onSetEditingLevelType?.(null);
          onOpenOrderModal("SHORT");
        }}
        className={`h-7 px-2.5 rounded font-black text-xs flex items-center gap-1 transition cursor-pointer border ${
          isOrderModalOpen && activeOrderSide === "SHORT"
            ? "bg-rose-600 text-white border-rose-500 shadow-xs"
            : "bg-surface border-surface-border text-foreground/80 hover:text-rose-500 hover:border-rose-500/50 hover:bg-surface-hover"
        }`}
        title="Open SHORT Order Panel (₹10k Slot)"
      >
        <span>SHRT</span>
      </button>

      <PositionLevelButtons
        hasActivePosition={hasActivePosition}
        editingLevelType={editingLevelType}
        stopLossPrice={stopLossPrice}
        targetPrice={targetPrice}
        onOpenEdit={handleOpenEdit}
      />

      {editingLevelType && (
        <LevelAdjustmentPopover
          editingLevelType={editingLevelType}
          positionSide={positionSide}
          entryPrice={entryPrice}
          draftLevelPrice={draftLevelPrice}
          hasLevel={editingLevelType === "SL" ? hasSL : hasTP}
          onDraftLevelPriceChange={onDraftLevelPriceChange}
          onSave={handleSave}
          onClear={handleClear}
          onClose={() => onSetEditingLevelType?.(null)}
        />
      )}
    </div>
  );
};
