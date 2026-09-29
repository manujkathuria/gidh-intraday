"use client";

import React, { useState, useEffect } from "react";
import { Zap, X } from "lucide-react";
import { FnoSymbolItem } from "../types";
import { SymbolSearchList } from "./SymbolSearchList";
import { OrderParametersSummary } from "./OrderParametersSummary";
import { OrderTypeControls } from "./OrderTypeControls";
import { OrderLimitPriceInput } from "./OrderLimitPriceInput";
import { OrderPriceLevelsInputs } from "./OrderPriceLevelsInputs";
import { OrderDispatchActionButtons } from "./OrderDispatchActionButtons";

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

export const OrderDispatchModal: React.FC<Props> = (props) => {
  const {
    isOpen, onClose, selectedSymbol, setSelectedSymbol,
    orderSide, setOrderSide, orderType, setOrderType,
    targetEntryPrice, setTargetEntryPrice, stopLossPrice, setStopLossPrice,
    targetPrice, setTargetPrice, searchFilter, setSearchFilter,
    filteredSymbols, submittingOrder, onSubmit,
  } = props;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { if (!isOpen) setConfirming(false); }, [isOpen]);
  useEffect(() => { setConfirming(false); }, [selectedSymbol, orderSide, orderType, targetEntryPrice]);

  if (!isOpen) return null;

  const selectedStock = filteredSymbols.find((s) => s.symbol === selectedSymbol);
  const limitNum = parseFloat(targetEntryPrice);
  const baselinePrice = orderType === "LIMIT" && !isNaN(limitNum) && limitNum > 0 ? limitNum : selectedStock?.price || 0;

  const applyDefaultLevels = (refPrice: number) => {
    if (!refPrice || refPrice <= 0) return;
    const isLong = orderSide === "LONG";
    setStopLossPrice((isLong ? refPrice * 0.99 : refPrice * 1.01).toFixed(2));
    setTargetPrice((isLong ? refPrice * 1.02 : refPrice * 0.98).toFixed(2));
  };

  const handleSelectOrderType = (type: "MARKET" | "LIMIT") => {
    setOrderType(type);
    if (type === "LIMIT" && !targetEntryPrice && selectedStock) {
      setTargetEntryPrice(selectedStock.price.toFixed(2));
      applyDefaultLevels(selectedStock.price);
    }
  };

  const handleLimitPriceChange = (val: string) => {
    setTargetEntryPrice(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) applyDefaultLevels(parsed);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-foreground" />
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Dispatch MIS Order (₹10k Slot)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 text-xs">
          <OrderTypeControls
            orderSide={orderSide}
            setOrderSide={setOrderSide}
            orderType={orderType}
            handleSelectOrderType={handleSelectOrderType}
            baselinePrice={baselinePrice}
            setStopLossPrice={setStopLossPrice}
            setTargetPrice={setTargetPrice}
          />

          <SymbolSearchList
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            filteredSymbols={filteredSymbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              const found = filteredSymbols.find((s) => s.symbol === sym);
              if (found) {
                if (orderType === "LIMIT" && !targetEntryPrice) setTargetEntryPrice(found.price.toFixed(2));
                const ref = orderType === "LIMIT" && targetEntryPrice ? parseFloat(targetEntryPrice) : found.price;
                applyDefaultLevels(ref || found.price);
              }
            }}
          />

          {orderType === "LIMIT" && (
            <OrderLimitPriceInput
              selectedStock={selectedStock}
              targetEntryPrice={targetEntryPrice}
              onLimitPriceChange={handleLimitPriceChange}
            />
          )}

          <OrderPriceLevelsInputs baselinePrice={baselinePrice} stopLossPrice={stopLossPrice} targetPrice={targetPrice} applyDefaultLevels={applyDefaultLevels} />
          <OrderParametersSummary selectedStock={selectedStock} orderSide={orderSide} orderType={orderType} targetEntryPrice={targetEntryPrice} stopLossPrice={stopLossPrice} targetPrice={targetPrice} />
          <OrderDispatchActionButtons onClose={onClose} selectedSymbol={selectedSymbol} orderSide={orderSide} submittingOrder={submittingOrder} confirming={confirming} />
        </form>
      </div>
    </div>
  );
};
