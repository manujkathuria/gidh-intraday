"use client";

import React from "react";
import { Activity, AlertCircle, Zap } from "lucide-react";

interface Props {
  onClose: () => void;
  selectedSymbol: string;
  orderSide: "LONG" | "SHORT";
  submittingOrder: boolean;
  confirming: boolean;
}

export const OrderDispatchActionButtons: React.FC<Props> = ({
  onClose,
  selectedSymbol,
  orderSide,
  submittingOrder,
  confirming,
}) => {
  return (
    <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground text-xs font-bold transition border border-surface-border cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={!selectedSymbol || submittingOrder}
        className={`px-4 py-1.5 rounded-lg text-xs font-black transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs ${
          confirming ? "bg-foreground text-background ring-2 ring-foreground/20 animate-in zoom-in-95 duration-100" : "bg-foreground hover:bg-foreground/90 text-background"
        }`}
      >
        {submittingOrder ? (
          <>
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>Submitting...</span>
          </>
        ) : confirming ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Confirm {orderSide} {selectedSymbol}?</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Dispatch Order</span>
          </>
        )}
      </button>
    </div>
  );
};
