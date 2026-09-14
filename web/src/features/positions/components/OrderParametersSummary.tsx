import React from "react";

export const OrderParametersSummary: React.FC = () => (
  <div className="p-3 bg-surface-muted border border-surface-border rounded-lg flex flex-col gap-1 text-[11px] text-foreground/70">
    <div className="flex justify-between">
      <span>Product:</span>
      <span className="font-bold text-foreground">MIS (Intraday)</span>
    </div>
    <div className="flex justify-between">
      <span>Slot Margin:</span>
      <span className="font-bold text-foreground">₹10,000 (5x = ₹50,000 Gross)</span>
    </div>
    <div className="flex justify-between">
      <span>Execution:</span>
      <span className="font-bold text-foreground">MARKET (market_protection: -1)</span>
    </div>
    <div className="flex justify-between">
      <span>Initial Risk:</span>
      <span className="font-bold text-foreground">-1.50% (-₹750 SL Floor)</span>
    </div>
  </div>
);
