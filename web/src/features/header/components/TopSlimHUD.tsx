"use client";

import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ModeSwitcher } from "./ModeSwitcher";
import { LiveStreamBar } from "./LiveStreamBar";
import { ReplayScrubberBar } from "./ReplayScrubberBar";
import { MobileReplayDrawer } from "./MobileReplayDrawer";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  mode: "LIVE" | "REPLAY";
  setMode: (mode: "LIVE" | "REPLAY") => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  sessions: string[];
  localTime: number;
  setLocalTime: (val: number) => void;
  setCurrentTimeMinutes: (val: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  stepBackward: (val: number) => void;
  stepForward: (val: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (val: number) => void;
  handleSliderChange: (val: number) => void;
  handleSliderCommit: () => void;
  liveClock: string;
  isDark: boolean;
  toggleTheme: () => void;
}

export const TopSlimHUD: React.FC<Props> = ({
  isCollapsed,
  toggleSidebar,
  mode,
  setMode,
  selectedDate,
  setSelectedDate,
  sessions,
  localTime,
  setLocalTime,
  setCurrentTimeMinutes,
  isPlaying,
  togglePlay,
  stepBackward,
  stepForward,
  playbackSpeed,
  setPlaybackSpeed,
  handleSliderChange,
  handleSliderCommit,
  liveClock,
  isDark,
  toggleTheme,
}) => {
  return (
    <header className="h-10 px-3 bg-surface border-b border-surface-border flex items-center justify-between gap-2.5 select-none shrink-0 z-20 text-xs">
      {/* 1. Left: Sidebar Toggle + Mode Switcher & Date */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border transition"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>

        <ModeSwitcher
          mode={mode}
          setMode={setMode}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          sessions={sessions}
        />
      </div>

      {/* 2. Center: Desktop Full Scrubber OR Live Stream (md+) */}
      <div className="hidden md:flex flex-1 items-center justify-center max-w-4xl min-w-0">
        {mode === "LIVE" ? (
          <LiveStreamBar liveClock={liveClock} />
        ) : (
          <ReplayScrubberBar
            localTime={localTime}
            setLocalTime={setLocalTime}
            setCurrentTimeMinutes={setCurrentTimeMinutes}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            stepBackward={stepBackward}
            stepForward={stepForward}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            handleSliderChange={handleSliderChange}
            handleSliderCommit={handleSliderCommit}
          />
        )}
      </div>

      {/* 3. Right: Mobile Replay Trigger + Theme Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Replay Drawer trigger (only in REPLAY mode on < md) */}
        {mode === "REPLAY" && (
          <div className="md:hidden">
            <MobileReplayDrawer
              localTime={localTime}
              setLocalTime={setLocalTime}
              setCurrentTimeMinutes={setCurrentTimeMinutes}
              isPlaying={isPlaying}
              togglePlay={togglePlay}
              stepBackward={stepBackward}
              stepForward={stepForward}
              playbackSpeed={playbackSpeed}
              setPlaybackSpeed={setPlaybackSpeed}
              handleSliderChange={handleSliderChange}
              handleSliderCommit={handleSliderCommit}
            />
          </div>
        )}

        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
};
