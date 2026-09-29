"use client";

import React, { useRef, useEffect } from "react";
import { ShieldAlert, Target, X, Check } from "lucide-react";

interface Props {
  editingLevelType: "SL" | "TP";
  positionSide: "LONG" | "SHORT";
  entryPrice?: number;
  draftLevelPrice: number;
  hasLevel: boolean;
  onDraftLevelPriceChange?: (price: number) => void;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const LevelAdjustmentPopover: React.FC<Props> = ({
  editingLevelType,
  positionSide,
  entryPrice,
  draftLevelPrice,
  hasLevel,
  onDraftLevelPriceChange,
  onSave,
  onClear,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        popoverRef.current?.contains(target) ||
        target.closest("[data-chart-interactive]") ||
        target.closest("canvas") ||
        target.closest(".chart-drag-handle")
      ) return;
      onClose();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  return (
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
        <button type="button" onClick={onClose} className="text-foreground/40 hover:text-foreground cursor-pointer">
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
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onClose();
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
          onClick={onSave}
          className={`flex-1 h-7 rounded text-[11px] font-black flex items-center justify-center gap-1 text-white cursor-pointer transition ${
            editingLevelType === "SL" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          <Check className="w-3 h-3" />
          <span>Confirm & Save</span>
        </button>

        {hasLevel && (
          <button
            type="button"
            onClick={onClear}
            className="h-7 px-2 rounded text-[11px] font-bold bg-surface-muted hover:bg-surface-hover border border-surface-border text-foreground/70 cursor-pointer"
            title="Remove Level"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
