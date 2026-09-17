"use client";

import React from "react";
import { Brain, Sparkles, Wrench } from "lucide-react";

export const QuantBrainView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 select-none">
      <div className="p-4 rounded-2xl bg-surface border border-surface-border mb-4 relative shadow-xs">
        <Brain className="w-10 h-10 text-foreground/80 animate-pulse" />
        <span className="absolute -top-1 -right-1 p-1 rounded-full bg-surface-muted border border-surface-border text-foreground">
          <Wrench className="w-3 h-3 text-foreground/60" />
        </span>
      </div>

      <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
        Quant Brain Architecture Under Construction
      </h2>

      <p className="text-xs text-foreground/50 max-w-md mt-1.5 leading-relaxed">
        Transitioning to specialized modular sub-brains (Scout Brain, Sector Resonance, Setup Filter, Risk & Portfolio Managers).
      </p>

      <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-[11px] text-foreground/60">
        <Sparkles className="w-3.5 h-3.5 text-foreground/40" />
        <span className="font-semibold">Status: Clean Slate / Building Sub-Brain #1 (Scout)</span>
      </div>
    </div>
  );
};
