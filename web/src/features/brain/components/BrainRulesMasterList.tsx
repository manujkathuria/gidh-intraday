"use client";

import React from "react";
import { BrainRule } from "../types";
import { CheckCircle2, Search } from "lucide-react";

interface Props {
  rules: BrainRule[];
  selectedRuleId: string;
  onSelectRule: (id: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
}

export const BrainRulesMasterList: React.FC<Props> = ({
  rules,
  selectedRuleId,
  onSelectRule,
  search,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col h-full bg-surface border border-surface-border rounded-lg overflow-hidden select-none text-xs">
      {/* Search Input */}
      <div className="p-2 border-b border-surface-border bg-surface shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search rules, triggers, conditions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full rounded-md bg-surface-muted pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground/40 border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground focus:border-foreground"
          />
        </div>
      </div>

      {/* Rules List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-surface-border">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-foreground/40 text-xs">
            No rules match your search.
          </div>
        ) : (
          rules.map((rule) => {
            const isSelected = rule.id === selectedRuleId;
            return (
              <div
                key={rule.id}
                onClick={() => onSelectRule(rule.id)}
                className={`p-3 cursor-pointer transition-colors flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-surface-hover/80 border-l-2 border-l-foreground"
                    : "hover:bg-surface-hover/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-muted border border-surface-border text-foreground/80 font-bold">
                      {rule.id.split("_")[0]}
                    </span>
                    <span className="text-[10px] text-foreground/50 font-medium">
                      {rule.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold tabular-nums text-foreground/70">
                      {(rule.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="font-bold text-foreground text-xs leading-snug line-clamp-1">
                  {rule.name}
                </div>

                {rule.triggerTime && (
                  <div className="text-[10px] text-foreground/40">
                    Trigger: <span className="text-foreground/70 font-medium">{rule.triggerTime}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

