"use client";

import React, { useState, useEffect } from "react";
import { Zap, X, Activity, AlertCircle } from "lucide-react";
import { FnoSymbolItem } from "../types";
import { SymbolSearchList } from "./SymbolSearchList";
import { OrderParametersSummary } from "./OrderParametersSummary";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;
  orderSide: "LONG" | "SHORT";
  setOrderSide: (side: "LONG" | "SHORT") => void;
  orderType: "MARKET" | "LIMIT";
  setOrderType: (type: "MARKET" | "LIMIT") => void;
  targetEntryPrice: string;
  setTargetEntryPrice: (val: string) => void;
  stopLossPrice: string;
  setStopLossPrice: (val: string) => void;
  targetPrice: string;
  setTargetPrice: (val: string) => void;
  searchFilter: string;
  setSearchFilter: (query: string) => void;
  filteredSymbols: FnoSymbolItem[];
  submittingOrder: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrderDispatchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedSymbol,
  setSelectedSymbol,
  orderSide,
  setOrderSide,
  orderType,
  setOrderType,
  targetEntryPrice,
  setTargetEntryPrice,
  stopLossPrice,
  setStopLossPrice,
  targetPrice,
  setTargetPrice,
  searchFilter,
  setSearchFilter,
  filteredSymbols,
  submittingOrder,
  onSubmit,
}) => {
  const [confirming, setConfirming] = useState(false);

  // Auto-reset confirmation state if modal closes or selected symbol changes
  useEffect(() => {
    if (!isOpen) {
      setConfirming(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setConfirming(false);
  }, [selectedSymbol, orderSide, orderType, targetEntryPrice]);

  if (!isOpen) return null;

  const selectedStock = filteredSymbols.find((s) => s.symbol === selectedSymbol);

  // Determine baseline entry price for calculation:
  // For LIMIT orders, use the typed limit entry if valid, else stock LTP.
  const limitNum = parseFloat(targetEntryPrice);
  const baselinePrice =
    orderType === "LIMIT" && !isNaN(limitNum) && limitNum > 0
      ? limitNum
      : selectedStock?.price || 0;

  const applyDefaultLevels = (refPrice: number) => {
    if (!refPrice || refPrice <= 0) return;
    const isLong = orderSide === "LONG";
    setStopLossPrice((isLong ? refPrice * 0.99 : refPrice * 1.01).toFixed(2));
    setTargetPrice((isLong ? refPrice * 1.02 : refPrice * 0.98).toFixed(2));
  };

  // When switching to LIMIT, auto-populate targetEntryPrice with stock price if empty
  const handleSelectOrderType = (type: "MARKET" | "LIMIT") => {
    setOrderType(type);
    if (type === "LIMIT" && !targetEntryPrice && selectedStock) {
      const p = selectedStock.price.toFixed(2);
      setTargetEntryPrice(p);
      applyDefaultLevels(selectedStock.price);
    }
  };

  // Recalculate default levels if target entry price changes in LIMIT mode
  const handleLimitPriceChange = (val: string) => {
    setTargetEntryPrice(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      applyDefaultLevels(parsed);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirming) {
      // First click: arm the dispatch button for immediate 1-click confirmation
      setConfirming(true);
      return;
    }
    // Second click: perform dispatch
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-foreground" />
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
              Dispatch MIS Order (₹10k Slot)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 text-xs">
          {/* Segmented Controls: Direction & Execution Mode */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Direction */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                Direction
              </span>
              <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
                <button
                  type="button"
                  onClick={() => {
                    setOrderSide("LONG");
                    if (baselinePrice > 0) {
                      const isLong = true;
                      setStopLossPrice((isLong ? baselinePrice * 0.99 : baselinePrice * 1.01).toFixed(2));
                      setTargetPrice((isLong ? baselinePrice * 1.02 : baselinePrice * 0.98).toFixed(2));
                    }
                  }}
                  className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${orderSide === "LONG"
                      ? "bg-surface text-foreground shadow-xs border border-surface-border"
                      : "text-foreground/50 hover:text-foreground"
                    }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderSide("SHORT");
                    if (baselinePrice > 0) {
                      const isLong = false;
                      setStopLossPrice((isLong ? baselinePrice * 0.99 : baselinePrice * 1.01).toFixed(2));
                      setTargetPrice((isLong ? baselinePrice * 1.02 : baselinePrice * 0.98).toFixed(2));
                    }
                  }}
                  className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${orderSide === "SHORT"
                      ? "bg-surface text-foreground shadow-xs border border-surface-border"
                      : "text-foreground/50 hover:text-foreground"
                    }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Execution Type */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                Execution
              </span>
              <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
                <button
                  type="button"
                  onClick={() => handleSelectOrderType("MARKET")}
                  className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${orderType === "MARKET"
                      ? "bg-surface text-foreground shadow-xs border border-surface-border"
                      : "text-foreground/50 hover:text-foreground"
                    }`}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOrderType("LIMIT")}
                  className={`py-1 rounded-md text-xs font-black transition cursor-pointer ${orderType === "LIMIT"
                      ? "bg-surface text-foreground shadow-xs border border-surface-border"
                      : "text-foreground/50 hover:text-foreground"
                    }`}
                >
                  LIMIT
                </button>
              </div>
            </div>
          </div>

          {/* Stock Search Combobox */}
          <SymbolSearchList
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            filteredSymbols={filteredSymbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              const found = filteredSymbols.find((s) => s.symbol === sym);
              if (found) {
                if (orderType === "LIMIT" && !targetEntryPrice) {
                  setTargetEntryPrice(found.price.toFixed(2));
                }
                const ref = orderType === "LIMIT" && targetEntryPrice ? parseFloat(targetEntryPrice) : found.price;
                applyDefaultLevels(ref || found.price);
              }
            }}
          />

          {/* Optional Virtual Limit Trigger */}
          {orderType === "LIMIT" && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Limit Entry Price (₹)
                </label>
                {selectedStock && (
                  <button
                    type="button"
                    onClick={() => handleLimitPriceChange(selectedStock.price.toFixed(2))}
                    className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer"
                  >
                    Use LTP (₹{selectedStock.price.toFixed(2)})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.05"
                placeholder={selectedStock ? `e.g. ${selectedStock.price.toFixed(2)}` : "Enter trigger price"}
                value={targetEntryPrice}
                onChange={(e) => handleLimitPriceChange(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground transition tabular-nums"
              />
            </div>
          )}

          {/* Stop Loss & Target Price Inline */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Expected Stop (₹)
                </label>
                {baselinePrice > 0 && (
                  <button
                    type="button"
                    onClick={() => applyDefaultLevels(baselinePrice)}
                    className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer"
                  >
                    1.0% MAE
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.05"
                placeholder="1.0% SL"
                value={stopLossPrice}
                readOnly
                className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground/70 tabular-nums cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Expected Target (₹)
                </label>
                {baselinePrice > 0 && (
                  <button
                    type="button"
                    onClick={() => applyDefaultLevels(baselinePrice)}
                    className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer"
                  >
                    2.0R Target
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.05"
                placeholder="2.0R TP"
                value={targetPrice}
                readOnly
                className="w-full bg-surface-muted border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground/70 tabular-nums cursor-not-allowed"
              />
            </div>
          </div>

          {/* Real-time calculated Risk Floor & Reward summary based on selected stock & limit entry */}
          <OrderParametersSummary
            selectedStock={selectedStock}
            orderSide={orderSide}
            orderType={orderType}
            targetEntryPrice={targetEntryPrice}
            stopLossPrice={stopLossPrice}
            targetPrice={targetPrice}
          />

          {/* Action Footer */}
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
              className={`px-4 py-1.5 rounded-lg text-xs  font-black transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs ${confirming
                  ? "bg-foreground text-background ring-2 ring-foreground/20 animate-in zoom-in-95 duration-100"
                  : "bg-foreground hover:bg-foreground/90 text-background"
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
        </form>
      </div>
    </div>
  );
};
