"use client";

import React, { useEffect, useRef } from "react";
import { ShieldAlert, Target, X, Check } from "lucide-react";

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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onSetEditingLevelType?.(null);
      }
    };
    if (editingLevelType) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [editingLevelType, onSetEditingLevelType]);

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
    if (initialPrice > 0) {
      onDraftLevelPriceChange?.(parseFloat(initialPrice.toFixed(2)));
    }
  };

  const handleSave = async () => {
    if (!onUpdateLevels) return;
    const priceToSave = draftLevelPrice > 0 ? draftLevelPrice : null;

    if (editingLevelType === "SL") {
      await onUpdateLevels(symbol, priceToSave, undefined);
    } else if (editingLevelType === "TP") {
      await onUpdateLevels(symbol, undefined, priceToSave);
    }
    onSetEditingLevelType?.(null);
  };

  const handleClear = async () => {
    if (!onUpdateLevels) return;
    if (editingLevelType === "SL") {
      await onUpdateLevels(symbol, null, undefined);
    } else if (editingLevelType === "TP") {
      await onUpdateLevels(symbol, undefined, null);
    }
    onSetEditingLevelType?.(null);
  };

  const hasSL = typeof stopLossPrice === "number" && stopLossPrice > 0;
  const hasTP = typeof targetPrice === "number" && targetPrice > 0;

  return (
    <div className="relative flex items-center gap-1.5 text-xs select-none">
      {/* 1. LONG Button (4 characters) */}
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

      {/* 2. SHRT Button (4 characters) */}
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

      {/* 3. Position SL & TP Controls (Available when position is active) */}
      {hasActivePosition && (
        <>
          <div className="h-4 w-[1px] bg-surface-border mx-0.5" />

          {/* SL Button */}
          <button
            type="button"
            onClick={() => handleOpenEdit("SL")}
            className={`h-7 px-2 rounded font-black text-xs flex items-center gap-1 transition cursor-pointer border ${
              editingLevelType === "SL"
                ? "bg-rose-600 text-white border-rose-500 shadow-xs ring-1 ring-rose-500"
                : hasSL
                ? "bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-surface border-surface-border text-foreground/60 hover:text-rose-500 hover:border-rose-500/40 hover:bg-surface-hover"
            }`}
            title={hasSL ? `Stop Loss: ₹${stopLossPrice?.toFixed(2)} (Click to drag & edit)` : "Click to drag & set Stop Loss"}
          >
            <ShieldAlert className={`w-3 h-3 ${editingLevelType === "SL" ? "text-white" : "text-rose-500"}`} />
            <span>{hasSL ? `SL: ₹${stopLossPrice?.toFixed(2)}` : "+ SL"}</span>
          </button>

          {/* TP Button */}
          <button
            type="button"
            onClick={() => handleOpenEdit("TP")}
            className={`h-7 px-2 rounded font-black text-xs flex items-center gap-1 transition cursor-pointer border ${
              editingLevelType === "TP"
                ? "bg-emerald-600 text-white border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                : hasTP
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-surface border-surface-border text-foreground/60 hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-surface-hover"
            }`}
            title={hasTP ? `Target Price: ₹${targetPrice?.toFixed(2)} (Click to drag & edit)` : "Click to drag & set Target Price"}
          >
            <Target className={`w-3 h-3 ${editingLevelType === "TP" ? "text-white" : "text-emerald-500"}`} />
            <span>{hasTP ? `TP: ₹${targetPrice?.toFixed(2)}` : "+ TP"}</span>
          </button>
        </>
      )}

      {/* Compact Popover for SL/TP input and Drag Indicator */}
      {editingLevelType && (
        <div
          ref={popoverRef}
          className="absolute top-9 left-24 z-50 bg-surface border border-surface-border shadow-2xl rounded-lg p-3 w-60 flex flex-col gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-foreground/70">
            <span className="flex items-center gap-1">
              {editingLevelType === "SL" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Adjust Stop Loss ({positionSide})</span>
                </>
              ) : (
                <>
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Adjust Target ({positionSide})</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => onSetEditingLevelType?.(null)}
              className="text-foreground/40 hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-foreground/60 flex items-center justify-between">
            <span>Entry: ₹{entryPrice?.toFixed(2) || "0.00"}</span>
            {draftLevelPrice > 0 && entryPrice && (
              <span className="font-bold">
                Diff: {(((draftLevelPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1.5 text-foreground/40 text-xs">₹</span>
              <input
                type="number"
                step="0.05"
                autoFocus
                placeholder="0.00"
                value={draftLevelPrice > 0 ? draftLevelPrice : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onDraftLevelPriceChange?.(isNaN(val) ? 0 : val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") onSetEditingLevelType?.(null);
                }}
                className="w-full h-8 pl-5 pr-2 bg-surface-hover border border-surface-border rounded text-xs font-bold text-foreground focus:outline-hidden focus:border-foreground/50 tabular-nums"
              />
            </div>
          </div>

          <p className="text-[10px] text-foreground/50 italic">
            💡 Drag the {editingLevelType === "SL" ? "red" : "green"} line on the chart, or type exact price above.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className={`flex-1 h-7 rounded text-[11px] font-black flex items-center justify-center gap-1 text-white cursor-pointer transition ${
                editingLevelType === "SL" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Confirm & Save</span>
            </button>

            {(editingLevelType === "SL" ? hasSL : hasTP) && (
              <button
                type="button"
                onClick={handleClear}
                className="h-7 px-2 rounded text-[11px] font-bold bg-surface-muted hover:bg-surface-hover border border-surface-border text-foreground/70 cursor-pointer"
                title="Remove Level"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
