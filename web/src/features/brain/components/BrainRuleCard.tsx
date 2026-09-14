"use client";

import React from "react";
import { Clock, Target, AlertTriangle } from "lucide-react";
import { BrainRule } from "../types";

interface Props {
  rule: BrainRule;
}

export const BrainRuleCard: React.FC<Props> = ({ rule }) => {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:border-surface-border/80 transition select-none">
      {/* 1. Header */}
      <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/80">
              {rule.category}
            </span>
            {rule.triggerTime && (
              <span className="flex items-center gap-1 text-[10px] text-foreground/60 font-medium">
                <Clock className="w-3 h-3 text-foreground/40" />
                <span>{rule.triggerTime}</span>
              </span>
            )}
          </div>

          <h3 className="text-sm font-black text-foreground tracking-tight leading-snug">
            {rule.name}
          </h3>
        </div>

        <div className="text-right shrink-0 bg-surface-muted border border-surface-border rounded-md px-2.5 py-1">
          <span className="text-[9px] font-bold text-foreground/40 uppercase block">
            Confidence
          </span>
          <span className="text-xs font-black text-foreground tabular-nums">
            {(rule.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 2. Conditions List */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block">
          Conditions:
        </span>
        <ul className="space-y-1 text-xs text-foreground/85 pl-1">
          {rule.conditions.map((cond, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0 mt-1.5" />
              <span className="leading-relaxed">{cond}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Execution Action Blueprint */}
      <div className="p-3 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-foreground/60 tracking-wider">
          <Target className="w-3 h-3 text-foreground/70" />
          <span>Execution Action</span>
        </div>
        <p className="text-xs font-bold text-foreground leading-relaxed">
          {rule.action}
        </p>
      </div>

      {/* 4. Invalidation / Protocol Notes */}
      {(rule.invalidation || rule.notes) && (
        <div className="pt-2 border-t border-surface-border flex flex-col gap-1.5 text-[11px] text-foreground/60">
          {rule.invalidation && (
            <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong className="font-bold text-rose-600 dark:text-rose-400">Invalidate: </strong>
                {rule.invalidation}
              </span>
            </div>
          )}
          {rule.notes && (
            <div className="text-foreground/50 text-[10px] leading-relaxed">
              <span className="font-bold text-foreground/70">Note: </span>
              {rule.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

