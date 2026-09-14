"use client";

import React from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronsUpDown, Check, Filter } from "lucide-react";
import { CategoryOption } from "../types";

interface Props {
  selectedCategory: string;
  onSelectCategory: (key: string) => void;
  categories: CategoryOption[];
}

export const BrainCategorySelect: React.FC<Props> = ({
  selectedCategory,
  onSelectCategory,
  categories,
}) => {
  const currentOption =
    categories.find((c) => c.key === selectedCategory) || categories[0];

  return (
    <div className="w-full sm:w-72 select-none text-xs">
      <Listbox
        value={currentOption}
        onChange={(opt: CategoryOption) => onSelectCategory(opt.key)}
      >
        <div className="relative">
          <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-surface border border-surface-border py-1.5 pl-3 pr-8 text-left text-foreground hover:bg-surface-hover/80 transition-colors focus:outline-none focus:border-foreground/40 shadow-xs">
            <span className="flex items-center gap-2 truncate">
              <Filter className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
              <span className="font-bold text-foreground">
                {currentOption.label}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-3.5 w-3.5 text-foreground/40" />
            </span>
          </ListboxButton>

          <ListboxOptions
            anchor="bottom start"
            transition
            className="z-50 mt-1 max-h-72 min-w-[var(--button-width)] w-80 overflow-y-auto rounded-lg bg-surface border border-surface-border py-1 shadow-2xl transition duration-100 ease-in data-leave:data-closed:opacity-0 focus:outline-none custom-scrollbar"
          >
            {categories.map((cat) => (
              <ListboxOption
                key={cat.key}
                value={cat}
                className="group relative cursor-pointer py-2 pr-7 pl-3 text-foreground/80 select-none data-focus:bg-foreground data-focus:text-background transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold group-data-selected:font-black tracking-wide">
                    {cat.label}
                  </span>
                </div>

                <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-foreground group-data-focus:text-background group-not-data-selected:hidden">
                  <Check className="h-3.5 w-3.5" />
                </span>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
};
