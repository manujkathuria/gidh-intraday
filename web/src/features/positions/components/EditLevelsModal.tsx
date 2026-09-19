"use client";

import React, { useState } from "react";
import { Sliders, XCircle, Check } from "lucide-react";
import { ActivePosition } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pos: ActivePosition;
  onUpdateLevels: (symbol: string, sl?: number, tp?: number) => Promise<boolean>;
}

export const EditLevelsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pos,
  onUpdateLevels,
}) => {
  const isLong = pos.side === "LONG" || pos.side === "BUY";
  const defaultSL = pos.stop_loss_price
    ? pos.stop_loss_price.toString()
    : isLong
    ? (pos.entry_price * 0.99).toFixed(2)
    : (pos.entry_price * 1.01).toFixed(2);
  const defaultTP = pos.target_price
    ? pos.target_price.toString()
    : isLong
    ? (pos.entry_price * 1.02).toFixed(2)
    : (pos.entry_price * 0.98).toFixed(2);

  const [slPrice, setSlPrice] = useState(defaultSL);
  const [tpPrice, setTpPrice] = useState(defaultTP);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const sl = slPrice ? parseFloat(slPrice) : undefined;
    const tp = tpPrice ? parseFloat(tpPrice) : undefined;
    await onUpdateLevels(pos.symbol, sl, tp);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-foreground" />
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">
              Set SL & TP • {pos.symbol}
            </h3>
          </div>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-foreground/60 flex justify-between bg-surface-muted p-2.5 rounded-lg border border-surface-border">
          <span>Entry: <b className="text-foreground">₹{pos.entry_price.toFixed(2)}</b></span>
          <span>LTP: <b className="text-foreground">₹{pos.current_ltp.toFixed(2)}</b></span>
          <span>Side: <b className="text-foreground">{pos.side}</b></span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-foreground/60 uppercase">
                Stop Loss Price (1.0% MAE)
              </label>
              <button
                type="button"
                onClick={() =>
                  setSlPrice(
                    isLong
                      ? (pos.entry_price * 0.99).toFixed(2)
                      : (pos.entry_price * 1.01).toFixed(2)
                  )
                }
                className="text-[9px] text-blue-500 hover:underline"
              >
                Reset 1.0%
              </button>
            </div>
            <input
              type="number"
              step="0.05"
              placeholder="e.g. 1391.25 (optional)"
              value={slPrice}
              onChange={(e) => setSlPrice(e.target.value)}
              className="w-full rounded-md bg-surface-muted px-3 py-1.5 text-xs text-foreground border border-surface-border focus:outline-none focus:border-foreground"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-foreground/60 uppercase">
                Target Price (2.0R Target)
              </label>
              <button
                type="button"
                onClick={() =>
                  setTpPrice(
                    isLong
                      ? (pos.entry_price * 1.02).toFixed(2)
                      : (pos.entry_price * 0.98).toFixed(2)
                  )
                }
                className="text-[9px] text-blue-500 hover:underline"
              >
                Reset 2.0R
              </button>
            </div>
            <input
              type="number"
              step="0.05"
              placeholder="e.g. 1433.45 (optional)"
              value={tpPrice}
              onChange={(e) => setTpPrice(e.target.value)}
              className="w-full rounded-md bg-surface-muted px-3 py-1.5 text-xs text-foreground border border-surface-border focus:outline-none focus:border-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-hover text-foreground font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-black text-xs transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Update Levels"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
