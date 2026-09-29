"use client";

import React from "react";

interface Props {
  orderSide: "LONG" | "SHORT";
  setOrderSide: (side: "LONG" | "SHORT") => void;
  orderType: "MARKET" | "LIMIT";
  handleSelectOrderType: (type: "MARKET" | "LIMIT") => void;
  baselinePrice: number;
  setStopLossPrice: (val: string) => void;
  setTargetPrice: (val: string) => void;
}

export const OrderTypeControls: React.FC<Props> = ({
  orderSide,
  setOrderSide,
  orderType,
  handleSelectOrderType,
  baselinePrice,
  setStopLossPrice,
  setTargetPrice,
}) => {
  const updateLevels = (isLong: boolean) => {
    if (baselinePrice > 0) {
      setStopLossPrice((isLong ? baselinePrice * 0.99 : baselinePrice * 1.01).toFixed(2));
      setTargetPrice((isLong ? baselinePrice * 1.02 : baselinePrice * 0.98).toFixed(2));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Direction</span>
        <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
          <button
            type="button"
            onClick={() => {
              setOrderSide("LONG");
              updateLevels(true);
            }}
            className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${
              orderSide === "LONG" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            LONG
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderSide("SHORT");
              updateLevels(false);
            }}
            className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${
              orderSide === "SHORT" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            SHORT
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Execution</span>
        <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
          <button
            type="button"
            onClick={() => handleSelectOrderType("MARKET")}
            className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${
              orderType === "MARKET" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            MARKET
          </button>
          <button
            type="button"
            onClick={() => handleSelectOrderType("LIMIT")}
            className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${
              orderType === "LIMIT" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            LIMIT
          </button>
        </div>
      </div>
    </div>
  );
};
