"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  symbol: string;
  quantity: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SquareOffConfirmModal: React.FC<Props> = ({ symbol, quantity, onConfirm, onCancel }) => {
  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-xs z-20 p-3 flex flex-col justify-between rounded-xl border border-surface-border animate-in fade-in duration-100">
      <div className="flex flex-col items-center text-center gap-1.5 pt-1">
        <div className="p-1.5 rounded-full bg-surface-muted text-foreground/80">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase text-foreground">Square Off {symbol}?</h4>
          <p className="text-[10px] text-foreground/60 mt-0.5">Market exit for {quantity} Qty</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full">
        <button
          onClick={onConfirm}
          className="w-full bg-foreground text-background hover:bg-foreground/90 font-black text-xs py-1.5 rounded-md shadow-xs transition cursor-pointer"
        >
          Confirm Exit
        </button>
        <button
          onClick={onCancel}
          className="w-full bg-surface-muted hover:bg-surface-hover text-foreground/70 font-bold text-xs py-1 rounded-md border border-surface-border transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
