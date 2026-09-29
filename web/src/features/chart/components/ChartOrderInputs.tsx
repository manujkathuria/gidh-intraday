"use client";

import React from "react";

interface Props {
  orderType: "MARKET" | "LIMIT";
  setOrderType: (type: "MARKET" | "LIMIT") => void;
  orderSide: "LONG" | "SHORT";
  currentPrice: number;
  qty: number;
  setCustomQty: (qty: number) => void;
  defaultQty: number;
  limitPrice: number;
  setLimitPrice: (price: number) => void;
}

export const ChartOrderInputs: React.FC<Props> = ({
  orderType,
  setOrderType,
  orderSide,
  currentPrice,
  qty,
  setCustomQty,
  defaultQty,
  limitPrice,
  setLimitPrice,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
        <button
          type="button"
          onClick={() => setOrderType("MARKET")}
          className={`py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
            orderType === "MARKET" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
          }`}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => {
            setOrderType("LIMIT");
            if (!limitPrice || limitPrice <= 0) setLimitPrice(currentPrice);
          }}
          className={`py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
            orderType === "LIMIT" ? "bg-surface text-foreground shadow-xs border border-surface-border" : "text-foreground/50 hover:text-foreground"
          }`}
        >
          Limit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Quantity</span>
            <button type="button" onClick={() => setCustomQty(defaultQty)} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground/70 hover:text-foreground transition cursor-pointer shadow-2xs">
              10k Slot
            </button>
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={qty || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCustomQty(isNaN(val) ? 0 : Math.max(1, val));
            }}
            className="w-full bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-foreground focus:outline-none focus:border-foreground transition"
            placeholder="Shares"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Price (₹)</span>
            {orderType === "LIMIT" && (
              <button type="button" onClick={() => setLimitPrice(currentPrice)} className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer">
                LTP
              </button>
            )}
          </div>
          {orderType === "MARKET" ? (
            <div className="w-full bg-surface-muted border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-foreground/60">
              ₹{currentPrice.toFixed(2)}
            </div>
          ) : (
            <input
              type="number"
              step="0.05"
              value={limitPrice || currentPrice}
              onChange={(e) => {
                let val = parseFloat(e.target.value) || currentPrice;
                if (currentPrice > 0) {
                  if (orderSide === "LONG") val = Math.min(val, currentPrice);
                  else if (orderSide === "SHORT") val = Math.max(val, currentPrice);
                }
                setLimitPrice(parseFloat(val.toFixed(2)));
              }}
              className="w-full bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-foreground focus:outline-none focus:border-foreground transition"
            />
          )}
        </div>
      </div>
    </>
  );
};
