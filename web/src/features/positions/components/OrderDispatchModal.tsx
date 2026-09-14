"use client";

import React from "react";
import { Zap, XCircle, Activity } from "lucide-react";
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
  orderTactic: string;
  setOrderTactic: (tactic: string) => void;
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
  orderTactic,
  setOrderTactic,
  searchFilter,
  setSearchFilter,
  filteredSymbols,
  submittingOrder,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl font-mono flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
              Dispatch Live MIS Order (₹10k Slot)
            </h3>
          </div>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-foreground/60 uppercase">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderSide("LONG")}
                className={`py-2 rounded-lg font-black transition border ${
                  orderSide === "LONG"
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground"
                }`}
              >
                LONG (BUY)
              </button>
              <button
                type="button"
                onClick={() => setOrderSide("SHORT")}
                className={`py-2 rounded-lg font-black transition border ${
                  orderSide === "SHORT"
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground"
                }`}
              >
                SHORT (SELL)
              </button>
            </div>
          </div>

          <SymbolSearchList
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            filteredSymbols={filteredSymbols}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              setSearchFilter(sym);
            }}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-foreground/60 uppercase">
              Brain Strategy / Tactic
            </label>
            <select
              value={orderTactic}
              onChange={(e) => setOrderTactic(e.target.value)}
              className="bg-surface-muted border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="15M ORB BREAKOUT">15M Opening Range Breakout</option>
              <option value="VWAP PULLBACK">VWAP Pullback / Bounce</option>
              <option value="VWAP FADE">VWAP Mean Reversion Fade</option>
              <option value="DAY HIGH BREAKOUT">Day High Volume Surge</option>
              <option value="SECTOR MOMENTUM">Sector Momentum Leader</option>
            </select>
          </div>

          <OrderParametersSummary />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-muted hover:bg-surface-hover text-foreground font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSymbol || submittingOrder}
              className="px-5 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-black transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingOrder ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Submitting to Zerodha...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
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
