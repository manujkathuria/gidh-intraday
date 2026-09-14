"use client";

import React from "react";
import { BrainRule } from "../types";
import { Clock, Target, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface Props {
  rule?: BrainRule;
}

export const BrainRuleDetailInspector: React.FC<Props> = ({ rule }) => {
  if (!rule) {
    return (
      <div className="h-full bg-surface border border-surface-border rounded-lg flex items-center justify-center p-8 text-center text-foreground/40 text-xs">
        Select a quantitative rule from the left to inspect execution logic.
      </div>
    );
  }

  return (
    <div className="h-full bg-surface border border-surface-border rounded-lg p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-xs select-none shadow-xs">
      {/* 1. Header with ID, Category, Confidence */}
      <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded bg-foreground text-background">
              {rule.id}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
              {rule.category}
            </span>
            {rule.triggerTime && (
              <span className="flex items-center gap-1 text-[11px] text-foreground/50">
                <Clock className="w-3.5 h-3.5" />
                <span>{rule.triggerTime}</span>
              </span>
            )}
          </div>
          <h2 className="text-base font-black text-foreground tracking-tight">
            {rule.name}
          </h2>
        </div>

        <div className="text-right shrink-0 bg-surface-muted border border-surface-border rounded-md px-3 py-1.5">
          <div className="text-[10px] text-foreground/50 font-bold uppercase">Confidence</div>
          <div className="text-base font-black text-foreground tabular-nums flex items-center justify-end gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {(rule.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* 2. Execution Action Callout */}
      <div className="p-3.5 bg-surface-muted border border-surface-border rounded-lg flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-foreground/60 tracking-wider">
          <Target className="w-3.5 h-3.5 text-foreground" />
          <span>Execution Action</span>
        </div>
        <p className="text-xs font-bold text-foreground leading-relaxed">
          {rule.action}
        </p>
      </div>

      {/* 3. Quantitative Conditions Checklist */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-black uppercase text-foreground/50 tracking-wider">
          Quantitative Entry / Gate Conditions
        </div>
        <div className="flex flex-col divide-y divide-surface-border bg-surface-muted/40 border border-surface-border rounded-lg overflow-hidden">
          {rule.conditions.map((cond, idx) => (
            <div key={idx} className="p-2.5 flex items-start gap-2.5 text-xs text-foreground/90">
              <span className="w-4 h-4 rounded-full bg-surface border border-surface-border flex items-center justify-center text-[10px] font-bold text-foreground/60 shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-normal">{cond}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Invalidation & Risk Floor */}
      {rule.invalidation && (
        <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Hard Invalidation Floor</span>
          </div>
          <p className="text-xs font-medium text-foreground/80">
            {rule.invalidation}
          </p>
        </div>
      )}

      {/* 5. Quant Field Notes */}
      {rule.notes && (
        <div className="p-3 bg-surface-muted/30 border border-surface-border rounded-lg flex items-start gap-2 text-xs text-foreground/60">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground/40" />
          <p className="leading-relaxed">
            <span className="font-bold text-foreground/80">Field Protocol Note: </span>
            {rule.notes}
          </p>
        </div>
      )}
    </div>
  );
};
