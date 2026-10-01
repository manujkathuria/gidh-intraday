import React from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { ChevronDown, Clock } from "lucide-react";
import { ChartInterval } from "./candleAggregator";

interface Props {
  interval: ChartInterval;
  onChangeInterval: (val: ChartInterval) => void;
  mode?: "LIVE" | "REPLAY";
}

const INTERVAL_DESCRIPTIONS: Record<string, string> = {
  "1m": "1 Minute Intraday",
  "5m": "5 Minutes Standard",
  "15m": "15 Minutes Swing",
  "1h": "1 Hour Hourly",
};

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
];

export const ChartIntervalSelector: React.FC<Props> = ({
  interval,
  onChangeInterval,
}) => {
  const isDaily = interval === "1d";

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 select-none">
      {/* Quick Mode Toggle Pill: Daily Macro first, Intraday second (Monochrome theme, mobile-friendly) */}
      <div className="flex items-center p-0.5 rounded-md bg-surface-muted border border-surface-border">
        <button
          type="button"
          onClick={() => onChangeInterval("1d")}
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
            isDaily
              ? "bg-foreground text-background shadow-xs font-black"
              : "text-foreground/50 hover:text-foreground/80"
          }`}
          title="Switch to Daily Macro Structural View"
        >
          <span className="hidden sm:inline">📊 Daily Macro</span>
          <span className="sm:hidden font-black">Macro</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeInterval(interval === "1d" ? "5m" : interval)}
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
            !isDaily
              ? "bg-foreground text-background shadow-xs font-black"
              : "text-foreground/50 hover:text-foreground/80"
          }`}
          title="Switch to Intraday Session Mode"
        >
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="hidden sm:inline">Intraday</span>
          <span className="sm:hidden font-black">Intra</span>
        </button>
      </div>

      {/* Interval Sub-selector Menu */}
      {!isDaily && (
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted/80 hover:bg-surface-hover text-foreground font-black text-xs border border-surface-border transition-colors cursor-pointer shadow-2xs group">
            <span>{interval.toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 text-foreground/40 group-hover:text-foreground/80 transition-colors" />
          </MenuButton>

          <MenuItems
            transition
            className="absolute left-0 top-full mt-1.5 w-44 rounded-lg bg-surface border border-surface-border p-1 shadow-xl z-50 focus:outline-hidden transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-leave:duration-75 text-xs"
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
                        <span className="font-bold">{item.label.toUpperCase()}</span>
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
      )}
    </div>
  );
};
