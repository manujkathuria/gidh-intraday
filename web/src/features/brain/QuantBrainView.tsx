"use client";

import React, { useState, useMemo } from "react";
import { BrainHeroMatrix } from "./components/BrainHeroMatrix";
import { SessionMilestonesTimeline } from "./components/SessionMilestonesTimeline";
import { CategoryTabs } from "./components/CategoryTabs";
import { BrainRuleCard } from "./components/BrainRuleCard";
import { ALL_BRAIN_RULES, BRAIN_CATEGORIES } from "./data";

export const QuantBrainView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredRules = useMemo(() => {
    return ALL_BRAIN_RULES.filter((r) => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [selectedCategory]);

  return (
    <div className="w-full px-6 py-5 flex-1 flex flex-col gap-5 max-w-7xl mx-auto">
      {/* 1. Intelligence Hero Summary */}
      <BrainHeroMatrix />

      {/* 2. Session Time Milestones */}
      <SessionMilestonesTimeline />

      {/* 3. Category Tabs Filter */}
      <CategoryTabs
        categories={BRAIN_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 4. Rule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {filteredRules.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-foreground/40 bg-surface border border-surface-border rounded-xl">
            No rules found in this category
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
