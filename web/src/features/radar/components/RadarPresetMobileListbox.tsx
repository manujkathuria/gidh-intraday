"use client";

import React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { RadarPreset } from "../types";

interface Props {
  preset: RadarPreset;
  setPreset: (preset: RadarPreset) => void;
  presets: { id: RadarPreset; label: string; icon: React.FC<{ className?: string }> }[];
}

export const RadarPresetMobileListbox: React.FC<Props> = ({ preset, setPreset, presets }) => {
  const currentPreset = presets.find((p) => p.id === preset) || presets[0];
  const CurrentIcon = currentPreset.icon;

  return (
    <div className="md:hidden flex-1 max-w-[130px]">
      <Listbox value={preset} onChange={setPreset}>
        <div className="relative text-xs">
          <ListboxButton className="flex items-center justify-between w-full cursor-pointer rounded-md bg-surface px-2.5 py-1.5 text-left text-foreground border border-surface-border focus:outline-1 focus:-outline-offset-1 focus:outline-foreground transition">
            <div className="flex items-center gap-1.5 truncate">
              <CurrentIcon className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
              <span className="font-bold truncate">{currentPreset.label}</span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-foreground/40 shrink-0 ml-1" />
          </ListboxButton>
          <ListboxOptions
            transition
            className="absolute z-50 mt-1 min-w-[140px] rounded-lg bg-surface border border-surface-border py-1 text-xs shadow-2xl outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
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
                    <span className="font-semibold group-data-selected:font-black">{p.label}</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-foreground group-not-data-selected:hidden group-data-focus:text-background" />
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
};
