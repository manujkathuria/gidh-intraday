"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, PanelLeft, Clock, Play, Pause } from "lucide-react";
import { formatMinutesToTime } from "@/stores/replayStore";
import { ThemeToggle } from "./ThemeToggle";
import { SessionCalendarPopover } from "./SessionCalendarPopover";

interface Props {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  mode: "LIVE" | "REPLAY";
  liveClock: string;
  localTime: number;
  isDark: boolean;
  toggleTheme: () => void;
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
  sessions?: string[];
  isPlaying?: boolean;
  togglePlay?: () => void;
}

export const AppBreadcrumbs: React.FC<Props> = ({
  isCollapsed,
  onToggleSidebar,
  mode,
  liveClock,
  localTime,
  isDark,
  toggleTheme,
  selectedDate,
  setSelectedDate,
  sessions = [],
  isPlaying = false,
  togglePlay,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol");

  const routeNames: Record<string, string> = {
    "/": "Radar",
    "/sectors": "Sectors",
    "/chart": "Charts",
    "/brain": "Quant Brain",
    "/positions": "Positions",
  };

  const currentRouteName = routeNames[pathname] || "Radar";
  const timeFormatted = formatMinutesToTime(localTime);

  return (
    <div className="flex items-center justify-between select-none shrink-0 text-xs py-0 w-full">
      {/* Left: Sidebar Toggle + Divider + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title={isCollapsed ? "Open Sidebar (Ctrl+B)" : "Close Sidebar (Ctrl+B)"}
          className="p-1 -ml-1 rounded-md hover:bg-surface-hover text-foreground/70 hover:text-foreground transition flex items-center justify-center cursor-pointer"
          aria-label="Toggle Navigation Sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        <div className="h-2.5 w-px bg-surface-border" />

        <div className="flex items-center gap-1.5">
          <Link
            href={pathname}
            className="font-bold text-foreground text-xs hover:opacity-80 transition tracking-wide leading-none"
          >
            {currentRouteName}
          </Link>

          {symbolParam && (
            <div className="flex items-center gap-2 text-foreground/40 leading-none">
              <ChevronRight className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
              <span className="font-bold text-foreground text-sm">
                {symbolParam}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Replay Date Calendar + Play/Pause + Clock + Theme Toggle */}
      <div className="flex items-center gap-1.5 text-foreground/80">
        {mode === "REPLAY" && setSelectedDate && (
          <>
            {/* Tailwind Headless UI Calendar Popover */}
            <SessionCalendarPopover
              selectedDate={selectedDate || ""}
              onSelectDate={setSelectedDate}
              validSessions={sessions}
            />

            {/* Play/Pause Button */}
            {togglePlay && (
              <button
                onClick={togglePlay}
                className="px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer hover:bg-surface-hover hover:text-foreground text-foreground/75"
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
              </button>
            )}
          </>
        )}

        {/* Clock */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-foreground/75 hover:bg-surface-hover hover:text-foreground transition cursor-default">
          <Clock className="w-3 h-3 text-foreground/50" />
          <span className="font-bold tracking-wider text-[11px] tabular-nums">
            {mode === "LIVE" ? liveClock || "09:15:00" : timeFormatted}
          </span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
};




