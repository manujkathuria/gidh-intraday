import React from "react";
import { FnoSymbolItem } from "../types";

interface Props {
  selectedStock?: FnoSymbolItem;
  orderSide: "LONG" | "SHORT";
  orderType: "MARKET" | "LIMIT";
  targetEntryPrice: string;
  stopLossPrice: string;
  targetPrice: string;
}

export const OrderParametersSummary: React.FC<Props> = ({
  selectedStock,
  orderSide,
  orderType,
  targetEntryPrice,
  stopLossPrice,
  targetPrice,
}) => {
  const limitEntryNum = parseFloat(targetEntryPrice);
  // In LIMIT orders, use the custom target entry price if specified, otherwise fall back to stock LTP
  const effectivePrice =
    orderType === "LIMIT" && !isNaN(limitEntryNum) && limitEntryNum > 0
      ? limitEntryNum
      : selectedStock?.price || 0;

  const grossPower = 50000; // ₹10,000 margin * 5x leverage
  const qty = effectivePrice > 0 ? Math.floor(grossPower / effectivePrice) : 0;
  const grossExposure = qty * effectivePrice;

  const slNum = parseFloat(stopLossPrice);
  const tpNum = parseFloat(targetPrice);

  let riskInr = 500;
  let rewardInr = 1000;
  let slPct = 1.0;
  let tpPct = 2.0;

  if (effectivePrice > 0 && qty > 0) {
    if (!isNaN(slNum) && slNum > 0) {
      const perShareRisk = Math.abs(effectivePrice - slNum);
      riskInr = perShareRisk * qty;
      slPct = (perShareRisk / effectivePrice) * 100;
    }
    if (!isNaN(tpNum) && tpNum > 0) {
      const perShareReward = Math.abs(tpNum - effectivePrice);
      rewardInr = perShareReward * qty;
      tpPct = (perShareReward / effectivePrice) * 100;
    }
  }

  const rrRatio = riskInr > 0 ? (rewardInr / riskInr).toFixed(1) : "2.0";

  if (!selectedStock && effectivePrice <= 0) {
    return (
      <div className="py-2 px-3 rounded-lg bg-surface border border-surface-border text-[11px]  text-foreground/50 flex items-center justify-between">
        <span>₹10k Margin • 5x Leverage</span>
        <span>Select stock for live math</span>
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs ">
      <div className="grid grid-cols-4 gap-2 text-center divide-x divide-surface-border">
        {/* Qty & Exposure */}
        <div>
          <div className="text-[10px] uppercase text-foreground/40 font-sans font-bold">Qty</div>
          <div className="font-black tabular-nums text-foreground mt-0.5">{qty}</div>
          <div className="text-[9px] text-foreground/40 tabular-nums">₹{grossExposure.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>

        {/* Max Risk (1% MAE) */}
        <div>
          <div className="text-[10px] uppercase text-foreground/40 font-sans font-bold">Max Risk</div>
          <div className="font-black tabular-nums text-foreground mt-0.5">-₹{riskInr.toFixed(0)}</div>
          <div className="text-[9px] text-foreground/40 tabular-nums">{slPct.toFixed(1)}% SL</div>
        </div>

        {/* Target Reward */}
        <div>
          <div className="text-[10px] uppercase text-foreground/40 font-sans font-bold">Target</div>
          <div className="font-black tabular-nums text-foreground mt-0.5">+₹{rewardInr.toFixed(0)}</div>
          <div className="text-[9px] text-foreground/40 tabular-nums">{tpPct.toFixed(1)}% TP</div>
        </div>

        {/* R:R Ratio */}
        <div>
          <div className="text-[10px] uppercase text-foreground/40 font-sans font-bold">R : R</div>
          <div className="font-black tabular-nums text-foreground mt-0.5">1 : {rrRatio}</div>
          <div className="text-[9px] text-foreground/40">Expected</div>
        </div>
      </div>
    </div>
  );
};
