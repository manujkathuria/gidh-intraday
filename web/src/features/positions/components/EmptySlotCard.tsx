"use client";

import React from "react";
import { Plus } from "lucide-react";

interface Props {
  slotIndex: number;
  onEnterTrade: () => void;
}

export const EmptySlotCard: React.FC<Props> = ({ slotIndex, onEnterTrade }) => {
  return (
    <div
      onClick={onEnterTrade}
      className="border border-dashed border-surface-border hover:border-foreground/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2.5 min-h-[260px] bg-surface/30 hover:bg-surface-hover/40 transition cursor-pointer group"
    >
      <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-foreground/40 group-hover:text-foreground group-hover:bg-surface transition">
        <Plus className="w-4 h-4" />
      </div>

      <div>
        <h4 className="text-xs  font-bold uppercase text-foreground/70 tracking-wider">
          Slot {slotIndex + 1}
        </h4>
        <p className="text-[10px] text-foreground/40 mt-0.5">
          ₹10,000 Available
        </p>
      </div>

      <span className="text-[10px] font-bold text-foreground/50 group-hover:text-foreground underline decoration-surface-border group-hover:decoration-foreground transition">
        + Dispatch MIS
      </span>
    </div>
  );
};
