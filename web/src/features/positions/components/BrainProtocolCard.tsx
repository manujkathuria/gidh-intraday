"use client";

import React, { useState } from "react";
import { Shield, ChevronDown } from "lucide-react";

export const BrainProtocolCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-1 bg-surface border border-surface-border rounded-xl text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-surface-hover/50 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-foreground/70" />
          <h3 className="text-xs  font-bold uppercase tracking-wider text-foreground/80">
            5-Slot Risk Protocol & Trailing Rules
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-foreground/40 font-medium">
          <span>{isOpen ? "Collapse" : "View Rules"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""
              }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-2 border-t border-surface-border grid grid-cols-1 md:grid-cols-4 gap-3 text-foreground/70 text-[11px] leading-relaxed bg-surface-muted/20 animate-in fade-in duration-100">
          <div className="p-2.5 bg-surface rounded-lg border border-surface-border">
            <span className="font-bold text-foreground block mb-1">
              1. Fixed Margin Geometry
            </span>
            ₹50k pool split into 5 slots × ₹10k margin. With 5x MIS leverage, each position controls ₹50,000 gross.
          </div>

          <div className="p-2.5 bg-surface rounded-lg border border-surface-border">
            <span className="font-bold text-foreground block mb-1">
              2. Hard Initial Stop Loss
            </span>
            1.00% Fixed MAE (-₹500 risk floor per slot). Automated market exit on trigger.
          </div>

          <div className="p-2.5 bg-surface rounded-lg border border-surface-border">
            <span className="font-bold text-foreground block mb-1">
              3. Milestone Ratchets
            </span>
            +1.50% MFE moves stop to BE (0.00%). +2.00% locks +1.00% profit. +3.50% locks +2.50% profit.
          </div>

          <div className="p-2.5 bg-surface rounded-lg border border-surface-border">
            <span className="font-bold text-foreground block mb-1">
              4. Mandatory Square-Off
            </span>
            All intraday positions unconditionally squared off at 15:15 IST prior to exchange close.
          </div>
        </div>
      )}
    </div>
  );
};
