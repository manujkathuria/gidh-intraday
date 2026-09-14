"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReplayStore, formatMinutesToTime } from "@/stores/replayStore";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Calendar,
  Clock,
  Sun,
  Moon,
  Radar,
  Shield,
  Activity,
  CandlestickChart as ChartIcon,
} from "lucide-react";

export const HeaderControls: React.FC = () => {
  const pathname = usePathname();
  const {
    sessions,
    selectedDate,
    setSelectedDate,
    currentTimeMinutes,
    setCurrentTimeMinutes,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    snapshot,
  } = useReplayStore();

  const [localTime, setLocalTime] = useState<number>(currentTimeMinutes);
  const isDraggingRef = useRef<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem("gidh-theme");
    const prefersDark = savedTheme ? savedTheme === "dark" : true;
    setIsDark(prefersDark);
    const root = document.documentElement;
    if (prefersDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const root = document.documentElement;
    if (nextDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("gidh-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("gidh-theme", "light");
    }
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTime(currentTimeMinutes);
    }
  }, [currentTimeMinutes]);

  const timeFormatted = formatMinutesToTime(localTime).slice(0, 5);
  const breadth = snapshot?.weather?.pct_above_vwap ?? 0;
  const isBullishRealm = breadth >= 50;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    setLocalTime(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    isDraggingRef.current = false;
    setCurrentTimeMinutes(localTime);
  };

  return (
    <header className="border-b border-surface-border bg-surface select-none shrink-0 transition-colors flex flex-col">
      {/* ROW 1: Brand, Global Navigation Menu & Utility Controls */}
      <div className="px-5 py-2 flex items-center justify-between border-b border-surface-border">
        {/* Left: Brand & Menu Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-widest text-foreground">
              GIDH
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-foreground/70 border border-surface-border">
              TERMINAL
            </span>
          </div>

          <div className="h-4 w-px bg-surface-border" />

          {/* Navigation Menu */}
          <nav className="flex items-center gap-1 font-mono text-xs">
            <Link
              href="/"
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${pathname === "/"
                  ? "bg-foreground text-background font-bold border-foreground shadow-sm"
                  : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Radar Leaderboard</span>
            </Link>

            <Link
              href="/sectors"
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${pathname === "/sectors"
                  ? "bg-foreground text-background font-bold border-foreground shadow-sm"
                  : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sector Battalions</span>
            </Link>

            <Link
              href="/chart"
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 border ${pathname === "/chart"
                  ? "bg-foreground text-background font-bold border-foreground shadow-sm"
                  : "bg-surface-muted border-surface-border text-foreground/60 hover:text-foreground hover:bg-surface-hover"
                }`}
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>Charts</span>
            </Link>
          </nav>
        </div>

        {/* Right: Date Picker, Market Breadth & Theme Switcher */}
        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-foreground/40" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-medium text-foreground focus:outline-none cursor-pointer"
            >
              {sessions.map((s, idx) => (
                <option key={`${s}-${idx}`} value={s} className="bg-surface text-foreground">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Market Breadth */}
          <div className="flex items-center gap-1.5 bg-surface-muted border border-surface-border rounded px-2.5 py-1 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-foreground/50" />
            <span className="text-foreground/50">VWAP:</span>
            <span className="font-bold text-foreground">
              {breadth.toFixed(0)}%
            </span>
            <span className="text-[10px] text-foreground/50">
              ({isBullishRealm ? "BULL" : "BEAR"})
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
            className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border transition"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-foreground/80" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-foreground/80" />
            )}
          </button>
        </div>
      </div>

      {/* ROW 2: Dedicated Replay & Timeline Scrubber Bar */}
      <div className="px-5 py-2 bg-surface-muted/30 flex items-center justify-between gap-4">
        {/* Playback & Step Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setLocalTime(554);
              setCurrentTimeMinutes(554);
            }}
            title="Reset 09:14 Pre-Open"
            className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => stepBackward(5)}
            title="-5 min"
            className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition ${isPlaying
                ? "bg-foreground text-background shadow-sm"
                : "bg-surface-muted hover:bg-surface-hover text-foreground border border-surface-border"
              }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" /> PAUSE
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> PLAY REPLAY
              </>
            )}
          </button>
          <button
            onClick={() => stepForward(5)}
            title="+5 min"
            className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Time Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-surface-border rounded min-w-[85px] justify-center">
          <Clock className="w-3.5 h-3.5 text-foreground/50" />
          <span className="font-mono text-xs font-bold text-foreground tracking-wide">
            {timeFormatted}
          </span>
          {localTime === 554 && (
            <span className="text-[9px] font-mono font-bold px-1 rounded bg-foreground text-background">
              PRE
            </span>
          )}
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 flex items-center gap-3 max-w-3xl">
          <span className="text-[10px] font-mono text-foreground/40">09:14</span>
          <input
            type="range"
            min={554}
            max={930}
            step={1}
            value={localTime}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            onKeyUp={handleSliderCommit}
            className="w-full h-1 bg-surface-border rounded appearance-none cursor-pointer accent-foreground"
          />
          <span className="text-[10px] font-mono text-foreground/40">15:30</span>
        </div>

        {/* Speed Multiplier Toggles */}
        <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5 font-mono">
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition ${playbackSpeed === spd
                  ? "bg-foreground text-background font-bold"
                  : "text-foreground/50 hover:text-foreground"
                }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
