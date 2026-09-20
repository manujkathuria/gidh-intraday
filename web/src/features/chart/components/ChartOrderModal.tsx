"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, X, Activity, AlertCircle, GripHorizontal } from "lucide-react";

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

  // Draggable Ref & State
  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number }>({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const prevOpenRef = useRef(false);
  const prevSymbolRef = useRef(symbol);

  const effectivePrice = orderType === "LIMIT" && limitPrice > 0 ? limitPrice : currentPrice;
  const isLong = orderSide === "LONG";

  useEffect(() => {
    setConfirming(false);
    const isFreshOpen = isOpen && !prevOpenRef.current;
    const isSymbolChange = symbol !== prevSymbolRef.current;
    
    if (isFreshOpen || isSymbolChange) {
      dragPosRef.current = { x: 0, y: 0 };
      if (modalRef.current) {
        modalRef.current.style.transform = `translate(0px, 0px)`;
      }
      // Initialize default 10k slot quantity
      const defaultQty = effectivePrice > 0 ? Math.floor(50000 / effectivePrice) : 1;
      setCustomQty(defaultQty);
    }
    
    prevOpenRef.current = isOpen;
    prevSymbolRef.current = symbol;
  }, [isOpen, symbol, effectivePrice]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    
    const header = e.currentTarget as HTMLElement;
    header.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: dragPosRef.current.x,
      startPosY: dragPosRef.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !modalRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const nextX = dragStartRef.current.startPosX + dx;
    const nextY = dragStartRef.current.startPosY + dy;
    
    dragPosRef.current = { x: nextX, y: nextY };
    modalRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

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
    const success = await onDispatchOrder(
      orderSide,
      orderType,
      orderType === "LIMIT" ? limitPrice : undefined,
      marginInr
    );
    setSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      style={{
        transform: `translate(${dragPosRef.current.x}px, ${dragPosRef.current.y}px)`,
        willChange: "transform",
      }}
      className="absolute top-3 left-3 z-40 w-80 bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col select-none"
    >
      {/* 1. Header with Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="px-3.5 py-2.5 bg-surface-muted border-b border-surface-border flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-foreground/40" />
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              isLong
                ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {isLong ? "BUY" : "SELL"}
          </span>
          <span className="text-xs font-bold text-foreground">{symbol}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-foreground">
            ₹{currentPrice.toFixed(2)}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-foreground/40 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Compact Form Body */}
      <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-2.5 text-xs">
        {/* Execution Type: Market vs Limit */}
        <div className="grid grid-cols-2 p-0.5 rounded-lg bg-surface-muted border border-surface-border">
          <button
            type="button"
            onClick={() => setOrderType("MARKET")}
            className={`py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              orderType === "MARKET"
                ? "bg-surface text-foreground shadow-xs border border-surface-border"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderType("LIMIT");
              if (!limitPrice || limitPrice <= 0) {
                setLimitPrice(currentPrice);
              }
            }}
            className={`py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
              orderType === "LIMIT"
                ? "bg-surface text-foreground shadow-xs border border-surface-border"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            Limit
          </button>
        </div>

        {/* Inputs: Quantity & Price */}
        <div className="grid grid-cols-2 gap-2">
          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">
                Quantity
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomQty(defaultQty);
                }}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground/70 hover:text-foreground transition cursor-pointer shadow-2xs"
                title="Reset to standard 10k margin slot"
              >
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

          {/* Price */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">
                Price (₹)
              </span>
              {orderType === "LIMIT" && (
                <button
                  type="button"
                  onClick={() => setLimitPrice(currentPrice)}
                  className="text-[9px] text-foreground/60 hover:text-foreground underline cursor-pointer"
                >
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
                    if (orderSide === "LONG") {
                      val = Math.min(val, currentPrice);
                    } else if (orderSide === "SHORT") {
                      val = Math.max(val, currentPrice);
                    }
                  }
                  setLimitPrice(parseFloat(val.toFixed(2)));
                }}
                className="w-full bg-surface border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-foreground focus:outline-none focus:border-foreground transition"
              />
            )}
          </div>
        </div>

        {/* Dynamic Margin & Exposure HUD */}
        <div className="flex items-center justify-between px-1 py-0.5 text-[11px] text-foreground/60 tabular-nums">
          <span>Margin: <strong className="text-foreground font-bold">₹{marginInr.toLocaleString()}</strong></span>
          <span>Exposure: <strong className="text-foreground font-bold">₹{grossExposure.toFixed(0)}</strong></span>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 mt-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
            confirming
              ? isLong
                ? "bg-emerald-600 text-white ring-2 ring-emerald-500/30"
                : "bg-rose-600 text-white ring-2 ring-rose-500/30"
              : isLong
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600 hover:bg-rose-500 text-white"
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


