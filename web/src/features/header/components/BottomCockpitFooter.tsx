"use client";

import React from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RotateCcw,
  Calendar,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
} from "lucide-react";
import { formatMinutesToTime } from "@/stores/replayStore";
import { ThemeToggle } from "./ThemeToggle";
import { MobileReplayDrawer } from "./MobileReplayDrawer";

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

export const BottomCockpitFooter: React.FC<Props> = ({
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
  const timeFormatted = formatMinutesToTime(localTime).slice(0, 5);

  return (
    <footer className="h-11 px-3 bg-surface border-t border-surface-border flex items-center justify-between gap-2.5 select-none shrink-0 z-30 text-xs shadow-lg">
      {/* 1. Left: Menu Toggle + Mode Switcher & Date */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          title="Toggle Navigation Menu"
          className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border transition flex items-center gap-1.5"
        >
          <Menu className="w-3.5 h-3.5 md:hidden" />
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 hidden md:block" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5 hidden md:block" />
          )}
        </button>

        {/* Mode Switcher */}
        <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5">
          <button
            onClick={() => setMode("LIVE")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold transition text-[11px] ${
              mode === "LIVE"
                ? "bg-foreground text-background shadow-xs font-black"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>LIVE</span>
          </button>
          <button
            onClick={() => setMode("REPLAY")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold transition text-[11px] ${
              mode === "REPLAY"
                ? "bg-foreground text-background shadow-xs font-black"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>REPLAY</span>
          </button>
        </div>

        {/* Date Selector in REPLAY mode */}
        {mode === "REPLAY" && (
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2 py-0.5">
            <Calendar className="w-3 h-3 text-foreground/40" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {sessions.map((s, idx) => (
                <option key={`${s}-${idx}`} value={s} className="bg-surface text-foreground">
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Center: Timeline & Controls (md+) OR Live Dot */}
      {mode === "LIVE" ? (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
          </span>
          <span className="font-bold text-foreground text-xs">LIVE STREAM ACTIVE</span>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center gap-3 max-w-2xl min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => stepBackward(5)}
              title="-5 min"
              className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 border border-surface-border"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={togglePlay}
              className={`px-2.5 py-0.5 rounded text-xs font-black flex items-center gap-1 transition ${
                isPlaying
                  ? "bg-foreground text-background"
                  : "bg-surface-muted hover:bg-surface-hover text-foreground border border-surface-border"
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
            <button
              onClick={() => stepForward(5)}
              title="+5 min"
              className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 border border-surface-border"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          <span className="font-bold text-foreground text-xs shrink-0">{timeFormatted}</span>

          <input
            type="range"
            min={554}
            max={930}
            step={1}
            value={localTime}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-1 bg-surface-border rounded appearance-none cursor-pointer accent-foreground"
          />

          <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5 shrink-0">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                  playbackSpeed === spd ? "bg-foreground text-background" : "text-foreground/50"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Right: Clock / Mobile Replay Trigger + Theme Toggle */}
      <div className="flex items-center gap-2 shrink-0">
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

        <div className="flex items-center gap-1 px-2 py-0.5 bg-surface-muted border border-surface-border rounded">
          <Clock className="w-3 h-3 text-foreground/50" />
          <span className="font-bold text-foreground tracking-wider text-[11px]">
            {mode === "LIVE" ? liveClock || "09:15:00" : timeFormatted}
          </span>
        </div>

        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
      </div>
    </footer>
  );
};
