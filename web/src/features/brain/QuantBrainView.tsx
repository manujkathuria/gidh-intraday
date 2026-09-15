"use client";

import React, { useState, useMemo, useEffect } from "react";
import { SessionMilestonesTimeline } from "./components/SessionMilestonesTimeline";
import { BrainCategorySelect } from "./components/BrainCategorySelect";
import { BrainRuleCard } from "./components/BrainRuleCard";
import { ALL_BRAIN_RULES, BRAIN_CATEGORIES } from "./data";
import { fetchQuantBrainRules } from "@/lib/api";
import { BrainRule } from "./types";
import { Search } from "lucide-react";

export const QuantBrainView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [rules, setRules] = useState<BrainRule[]>(ALL_BRAIN_RULES);

  useEffect(() => {
    let mounted = true;
    fetchQuantBrainRules()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setRules(data as BrainRule[]);
        }
      })
      .catch((err) => console.error("Error loading brain rules:", err));
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesAction = r.action.toLowerCase().includes(q);
        const matchesConditions = r.conditions.some((c) =>
          c.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesId && !matchesAction && !matchesConditions) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, search]);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Daily Operating Schedule Milestone Bar */}
      <SessionMilestonesTimeline />

      {/* 2. Controls Toolbar: Category Select + Search Filter + Count */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1">
          <BrainCategorySelect
            categories={BRAIN_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search rule names, triggers, actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg bg-surface border border-surface-border pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground/40 shadow-xs"
            />
          </div>
        </div>

        <div className="text-[11px] text-foreground/40 font-bold tabular-nums shrink-0 self-end sm:self-center">
          Showing {filteredRules.length} rules
        </div>
      </div>

      {/* 3. High-Readability Rule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {filteredRules.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-foreground/40 bg-surface border border-surface-border rounded-xl text-xs">
            No rules match your category or search filter
          </div>
        ) : (
          filteredRules.map((rule) => (
            <BrainRuleCard key={rule.id} rule={rule} />
          ))
        )}
      </div>
    </div>
  );
};




