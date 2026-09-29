"use client";

import React from "react";

interface Props {
  baselinePrice: number;
  stopLossPrice: string;
  targetPrice: string;
  applyDefaultLevels: (refPrice: number) => void;
}

export const OrderPriceLevelsInputs: React.FC<Props> = ({
  baselinePrice,
  stopLossPrice,
  targetPrice,
  applyDefaultLevels,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Expected Stop (₹)</label>
          {baselinePrice > 0 && (
            <button type="button" onClick={() => applyDefaultLevels(baselinePrice)} className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer">
              1.0% MAE
            </button>
          )}
        </div>
        <input type="number" step="0.05" placeholder="1.0% SL" value={stopLossPrice} readOnly className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground/70 tabular-nums cursor-not-allowed" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Expected Target (₹)</label>
          {baselinePrice > 0 && (
            <button type="button" onClick={() => applyDefaultLevels(baselinePrice)} className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer">
              2.0R Target
            </button>
          )}
        </div>
        <input type="number" step="0.05" placeholder="2.0R TP" value={targetPrice} readOnly className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground/70 tabular-nums cursor-not-allowed" />
      </div>
    </div>
  );
};
