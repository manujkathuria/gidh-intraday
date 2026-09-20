"use client";

import React, { useMemo } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronsUpDown, Check, TrendingUp, TrendingDown } from "lucide-react";
import { SectorOption } from "../types";

interface Props {
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  sectorOptions: SectorOption[];
}

export const SectorListbox: React.FC<Props> = ({
  selectedSector,
  setSelectedSector,
  sectorOptions,
}) => {
  const currentOption =
    sectorOptions.find((opt) => opt.sector === selectedSector) ||
    sectorOptions[0] || { sector: "ALL", label: "All Sectors", count: 210 };

  const { gainers, losers, allOption } = useMemo(() => {
    const all = sectorOptions.find((s) => s.sector === "ALL") || {
      sector: "ALL",
      label: "All Sectors",
      count: 210,
      avgMovePct: 0,
    };
    const rest = sectorOptions.filter((s) => s.sector !== "ALL");
    const g = rest
      .filter((s) => (s.avgMovePct || 0) >= 0)
      .sort((a, b) => (b.avgMovePct || 0) - (a.avgMovePct || 0));
    const l = rest
      .filter((s) => (s.avgMovePct || 0) < 0)
      .sort((a, b) => (a.avgMovePct || 0) - (b.avgMovePct || 0));

    return { gainers: g, losers: l, allOption: all };
  }, [sectorOptions]);

  const renderOption = (opt: SectorOption) => {
    const isAll = opt.sector === "ALL";
    const move = opt.avgMovePct || 0;

    return (
      <ListboxOption
        key={opt.sector}
        value={opt}
        className="group relative cursor-pointer py-1.5 pr-7 pl-3 text-foreground/80 select-none data-focus:bg-foreground data-focus:text-background transition-colors flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold group-data-selected:font-black tracking-wide">
            {opt.label}
          </span>
          {opt.count !== undefined && (
            <span className="text-[10px] opacity-50">
              ({opt.count})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {!isAll && (
            <span
              className={`font-bold tabular-nums ${
                move > 0
                  ? "text-emerald-600 dark:text-emerald-400 group-data-focus:text-background"
                  : move < 0
                  ? "text-rose-600 dark:text-rose-400 group-data-focus:text-background"
                  : "text-foreground/60"
              }`}
            >
              {move >= 0 ? "+" : ""}
              {move.toFixed(2)}%
            </span>
          )}
          <span className="w-3.5 flex justify-end">
            <Check
              aria-hidden="true"
              className="w-3.5 h-3.5 text-foreground group-not-data-selected:hidden group-data-focus:text-background"
            />
          </span>
        </div>
      </ListboxOption>
    );
  };

  return (
    <Listbox
      value={currentOption}
      onChange={(opt: SectorOption) => setSelectedSector(opt.sector)}
    >
      <div className="relative min-w-[190px] text-xs">
        <ListboxButton className="grid w-full cursor-pointer grid-cols-1 rounded-md bg-background py-1.5 pr-2.5 pl-3 text-left text-foreground border border-surface-border focus:outline-none focus:border-foreground/60 transition">
          <span className="col-start-1 row-start-1 truncate pr-6 font-medium">
            {currentOption.label}{" "}
            {currentOption.count !== undefined ? `(${currentOption.count})` : ""}
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="col-start-1 row-start-1 w-3.5 h-3.5 self-center justify-self-end text-foreground/40"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-50 mt-1 min-w-[280px] max-h-80 w-max overflow-auto rounded-lg bg-background border border-surface-border py-1 text-xs shadow-2xl outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 custom-scrollbar divide-y divide-surface-border/40"
        >
          {/* 1. All Sectors */}
          <div className="py-1">
            {renderOption(allOption)}
          </div>

          {/* 2. Top Gaining Sectors */}
          {gainers.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                <span>Gainers</span>
              </div>
              {gainers.map(renderOption)}
            </div>
          )}

          {/* 3. Top Losing Sectors */}
          {losers.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" />
                <span>Losers</span>
              </div>
              {losers.map(renderOption)}
            </div>
          )}
        </ListboxOptions>
      </div>
    </Listbox>
  );
};
