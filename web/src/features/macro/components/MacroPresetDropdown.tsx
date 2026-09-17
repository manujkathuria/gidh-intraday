"use client";

import React from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronsUpDown, Check, Layers, TrendingUp, TrendingDown, ShieldAlert, Zap } from "lucide-react";

export type MacroPreset = "ALL" | "LONGS" | "SHORTS" | "UNWINDING" | "COVERING";

interface PresetItem {
  id: MacroPreset;
  label: string;
  icon: React.FC<{ className?: string }>;
  count: number;
}

interface Props {
  preset: MacroPreset;
  setPreset: (val: MacroPreset) => void;
  presets: PresetItem[];
}

export const MacroPresetDropdown: React.FC<Props> = ({ preset, setPreset, presets }) => {
  const current = presets.find((p) => p.id === preset) || presets[0];
  const CurrentIcon = current.icon;

  return (
    <Listbox value={preset} onChange={setPreset}>
      <div className="relative flex-1 min-w-[140px] text-xs">
        <ListboxButton className="flex items-center justify-between w-full cursor-pointer rounded-md bg-surface px-2.5 py-1.5 text-left text-foreground border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground transition">
          <div className="flex items-center gap-1.5 truncate">
            <CurrentIcon className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
            <span className="font-bold truncate">{current.label}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-surface-muted text-foreground/60 font-mono">
              {current.count}
            </span>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 ml-1" />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-50 mt-1 min-w-[200px] w-full rounded-lg bg-surface border border-surface-border py-1 text-xs shadow-2xl outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
        >
          {presets.map((p) => {
            const Icon = p.icon;
            return (
              <ListboxOption
                key={p.id}
                value={p.id}
                className="group relative cursor-pointer py-2 pr-7 pl-3 text-foreground/80 select-none data-focus:bg-foreground data-focus:text-background transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 opacity-70 group-data-focus:opacity-100" />
                  <span className="font-semibold group-data-selected:font-black">
                    {p.label}
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">
                    ({p.count})
                  </span>
                </div>
                <Check className="w-3.5 h-3.5 text-foreground group-not-data-selected:hidden group-data-focus:text-background" />
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </div>
    </Listbox>
  );
};
