"use client";

import React from "react";
import { BrandNavigation } from "./components/BrandNavigation";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { BreadthIndicator } from "./components/BreadthIndicator";
import { ThemeToggle } from "./components/ThemeToggle";
import { LiveStreamBar } from "./components/LiveStreamBar";
import { ReplayScrubberBar } from "./components/ReplayScrubberBar";
import { useHeaderState } from "./hooks/useHeaderState";

export const HeaderControls: React.FC = () => {
  const {
    mode,
    setMode,
    sessions,
    selectedDate,
    setSelectedDate,
    currentTimeMinutes,
    setCurrentTimeMinutes,
    localTime,
    setLocalTime,
    handleSliderChange,
    handleSliderCommit,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    snapshot,
    activeCount,
    isDark,
    toggleTheme,
    liveClock,
  } = useHeaderState();

  const breadth = snapshot?.weather?.pct_above_vwap ?? 0;

  return (
    <header className="border-b border-surface-border bg-surface select-none shrink-0 transition-colors flex flex-col">
      {/* ROW 1: Brand Navigation, Mode Switcher & Global Controls */}
      <div className="px-5 py-2 flex items-center justify-between border-b border-surface-border">
        <BrandNavigation activeCount={activeCount} />

        <div className="flex items-center gap-3">
          <ModeSwitcher
            mode={mode}
            setMode={setMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
          />

          <BreadthIndicator breadth={breadth} />

          <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        </div>
      </div>

      {/* ROW 2: Stream Status (LIVE) vs Timeline Scrubber (REPLAY) */}
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
    </header>
  );
};
