"use client";

import React, { useState, useEffect } from "react";
import { Zap, X, Activity, AlertCircle, GripHorizontal } from "lucide-react";
import { useDraggableModal } from "../hooks/useDraggableModal";
import { ChartOrderInputs } from "./ChartOrderInputs";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  orderSide: "LONG" | "SHORT";
  orderType: "MARKET" | "LIMIT";
  setOrderType: (type: "MARKET" | "LIMIT") => void;
  limitPrice: number;
  setLimitPrice: (price: number) => void;
  onDispatchOrder: (side: "LONG" | "SHORT", orderType: "MARKET" | "LIMIT", limitPrice?: number, marginInr?: number) => Promise<boolean>;
}

export const ChartOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  orderSide,
  orderType,
  setOrderType,
  limitPrice,
  setLimitPrice,
  onDispatchOrder,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customQty, setCustomQty] = useState<number>(0);

  const { modalRef, dragPos, dragHandlers } = useDraggableModal(isOpen, symbol);
  const effectivePrice = orderType === "LIMIT" && limitPrice > 0 ? limitPrice : currentPrice;
  const isLong = orderSide === "LONG";

  useEffect(() => {
    setConfirming(false);
    if (isOpen) {
      const defaultQty = effectivePrice > 0 ? Math.floor(50000 / effectivePrice) : 1;
      setCustomQty(defaultQty);
    }
  }, [isOpen, symbol, effectivePrice]);

  if (!isOpen) return null;

  const defaultQty = effectivePrice > 0 ? Math.max(1, Math.floor(50000 / effectivePrice)) : 1;
  const qty = customQty > 0 ? customQty : defaultQty;
  const grossExposure = qty * effectivePrice;
  const marginInr = Math.max(1, Math.ceil(grossExposure / 5));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    const success = await onDispatchOrder(orderSide, orderType, orderType === "LIMIT" ? limitPrice : undefined, marginInr);
    setSubmitting(false);
    if (success) onClose();
  };

  return (
    <div
      ref={modalRef}
      style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)`, willChange: "transform" }}
      className="absolute top-3 left-3 z-40 w-80 bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col select-none"
    >
      <div {...dragHandlers} className="px-3.5 py-2.5 bg-surface-muted border-b border-surface-border flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none">
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isLong ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20" : "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20"}`}>
            {isLong ? "BUY" : "SELL"}
          </span>
          <span className="text-xs font-bold text-foreground">{symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-foreground">₹{currentPrice.toFixed(2)}</span>
          <button onClick={onClose} className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-2.5 text-xs">
        <ChartOrderInputs
          orderType={orderType}
          setOrderType={setOrderType}
          orderSide={orderSide}
          currentPrice={currentPrice}
          qty={qty}
          setCustomQty={setCustomQty}
          defaultQty={defaultQty}
          limitPrice={limitPrice}
          setLimitPrice={setLimitPrice}
        />

        <div className="flex items-center justify-between px-1 py-0.5 text-[11px] text-foreground/60 tabular-nums">
          <span>Margin: <strong className="text-foreground font-bold">₹{marginInr.toLocaleString()}</strong></span>
          <span>Exposure: <strong className="text-foreground font-bold">₹{grossExposure.toFixed(0)}</strong></span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 mt-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
            confirming
              ? isLong ? "bg-emerald-600 text-white ring-2 ring-emerald-500/30" : "bg-rose-600 text-white ring-2 ring-rose-500/30"
              : isLong ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}
        >
          {submitting ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : confirming ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Confirm {isLong ? "BUY" : "SELL"} {qty} sh @ ₹{effectivePrice.toFixed(2)}?</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isLong ? "Buy / Long" : "Sell / Short"} {qty} shares</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
