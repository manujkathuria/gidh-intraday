"use client";

import React from "react";
import { ShieldAlert, Target } from "lucide-react";

interface Props {
  hasActivePosition: boolean;
  editingLevelType: "SL" | "TP" | null;
  stopLossPrice?: number;
  targetPrice?: number;
  onOpenEdit: (type: "SL" | "TP") => void;
}

export const PositionLevelButtons: React.FC<Props> = ({
  hasActivePosition,
  editingLevelType,
  stopLossPrice,
  targetPrice,
  onOpenEdit,
}) => {
  if (!hasActivePosition) return null;

  const hasSL = typeof stopLossPrice === "number" && stopLossPrice > 0;
  const hasTP = typeof targetPrice === "number" && targetPrice > 0;

  return (
    <>
      <div className="h-4 w-[1px] bg-surface-border mx-0.5" />
      <button
        type="button"
        onClick={() => onOpenEdit("SL")}
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

      <button
        type="button"
        onClick={() => onOpenEdit("TP")}
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
  );
};
