"use client";

import React from "react";
import { CategoryOption } from "../types";

interface Props {
  categories: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (key: string) => void;
}

export const CategoryTabs: React.FC<Props> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelectCategory(cat.key)}
          className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap font-bold transition border cursor-pointer ${
            selectedCategory === cat.key
              ? "bg-surface-muted text-foreground font-extrabold border-surface-border shadow-2xs"
              : "bg-transparent border-transparent text-foreground/60 hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
};
