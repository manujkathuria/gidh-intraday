"use client";

import React from "react";
import { Clock, Target } from "lucide-react";
import { BrainRule } from "../types";

interface Props {
  rule: BrainRule;
}

export const BrainRuleCard: React.FC<Props> = ({ rule }) => {
  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:border-surface-border/80 transition">
      {/* Rule Header */}
      <div className="flex items-start justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-foreground/70">
              {rule.id}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-surface-border text-foreground/50">
              {rule.category}
            </span>
          </div>
          <h3 className="text-sm font-black text-foreground tracking-tight">
            {rule.name}
          </h3>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-foreground/40 block">
            Confidence
          </span>
          <span className="text-sm font-black text-foreground">
            {(rule.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Timing Trigger */}
      {rule.triggerTime && (
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/60">
          <Clock className="w-3.5 h-3.5 text-foreground/40" />
          <span>Trigger:</span>
          <span className="font-bold text-foreground">{rule.triggerTime}</span>
        </div>
      )}

      {/* Conditions List */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-foreground/40 uppercase block">
          Quantitative Conditions:
        </span>
        <ul className="space-y-1 text-[11px] text-foreground/80 pl-2">
          {rule.conditions.map((cond, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-foreground/40">•</span>
              <span>{cond}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Blueprint */}
      <div className="p-3 bg-surface-muted rounded-lg border border-surface-border flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-foreground/50">
          <Target className="w-3 h-3 text-foreground/60" />
          <span>Execution Action:</span>
        </div>
        <p className="text-[11px] font-bold text-foreground leading-relaxed">
          {rule.action}
        </p>
      </div>

      {/* Invalidation / Notes Footer */}
      {(rule.invalidation || rule.notes) && (
        <div className="pt-2 border-t border-surface-border flex flex-col gap-1 text-[10px] text-foreground/50">
          {rule.invalidation && (
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-foreground/60 shrink-0">
                Invalidate:
              </span>
              <span className="text-foreground/80 font-mono">
                {rule.invalidation}
              </span>
            </div>
          )}
          {rule.notes && (
            <div className="text-foreground/40 italic">Note: {rule.notes}</div>
          )}
        </div>
      )}
    </div>
  );
};
