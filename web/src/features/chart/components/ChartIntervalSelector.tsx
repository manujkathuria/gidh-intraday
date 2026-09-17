import React from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { ChevronDown, Clock } from "lucide-react";
import { ChartInterval } from "./candleAggregator";

interface Props {
  interval: ChartInterval;
  onChangeInterval: (val: ChartInterval) => void;
  mode?: "LIVE" | "REPLAY";
}

const INTERVAL_DESCRIPTIONS: Record<ChartInterval, string> = {
  "1m": "1 Minute",
  "5m": "5 Minutes",
  "15m": "15 Minutes",
  "1h": "1 Hour",
  "1d": "Daily",
};

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "1d", value: "1d" },
];

export const ChartIntervalSelector: React.FC<Props> = ({
  interval,
  onChangeInterval,
}) => {
  return (
    <Menu as="div" className="relative inline-block text-left select-none">
      <MenuButton className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted/80 hover:bg-surface-hover text-foreground font-black text-xs border border-surface-border transition-colors cursor-pointer shadow-2xs group">
        <Clock className="w-3.5 h-3.5 text-foreground/50 group-hover:text-foreground/80 transition-colors" />
        <span>{interval.toUpperCase()}</span>
        <ChevronDown className="w-3 h-3 text-foreground/40 group-hover:text-foreground/80 transition-colors" />
      </MenuButton>

      <MenuItems
        transition
        className="absolute left-0 top-full mt-1.5 w-36 rounded-lg bg-surface border border-surface-border p-1 shadow-xl z-50 focus:outline-hidden transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-leave:duration-75 text-xs"
      >
        <div className="flex flex-col gap-0.5">
          {INTERVALS.map((item) => {
            const isSelected = item.value === interval;
            return (
              <MenuItem key={item.value}>
                {({ focus }) => (
                  <button
                    onClick={() => onChangeInterval(item.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-foreground text-background font-black shadow-xs"
                        : focus
                        ? "bg-surface-hover text-foreground"
                        : "text-foreground/80 hover:bg-surface-hover"
                    }`}
                  >
                    <span className="font-bold">{item.label}</span>
                    <span
                      className={`text-[10px] ${
                        isSelected ? "text-background/80 font-bold" : "text-foreground/40"
                      }`}
                    >
                      {INTERVAL_DESCRIPTIONS[item.value]}
                    </span>
                  </button>
                )}
              </MenuItem>
            );
          })}
        </div>
      </MenuItems>
    </Menu>
  );
};
