"use client";

import React from "react";
import { ShieldCheck, Plus } from "lucide-react";

interface Props {
  slotIndex: number;
  onEnterTrade: () => void;
}

export const EmptySlotCard: React.FC<Props> = ({ slotIndex, onEnterTrade }) => {
  return (
    <div className="border-2 border-dashed border-surface-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[300px] hover:border-surface-border/80 transition">
      <div className="p-3 rounded-full bg-surface-muted text-foreground/30">
        <ShieldCheck className="w-6 h-6" />
      </div>

      <div>
        <h4 className="text-xs font-black uppercase text-foreground/60">
          Slot {slotIndex + 1} Empty
        </h4>
        <p className="text-[11px] text-foreground/40 mt-0.5">
          ₹10,000 Margin Available
        </p>
      </div>

      <button
        onClick={onEnterTrade}
        className="px-3 py-1.5 rounded-md bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border text-xs font-bold transition flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        <span>Enter Trade</span>
      </button>
    </div>
  );
};
