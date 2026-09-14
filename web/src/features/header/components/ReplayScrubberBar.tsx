"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
} from "lucide-react";
import { formatMinutesToTime } from "@/stores/replayStore";
import { MarketPhaseJumpButtons } from "./MarketPhaseJumpButtons";

interface Props {
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
}

export const ReplayScrubberBar: React.FC<Props> = ({
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
}) => {
  const timeFormatted = formatMinutesToTime(localTime).slice(0, 5);

  const jumpToPhase = (minutes: number) => {
    setLocalTime(minutes);
    setCurrentTimeMinutes(minutes);
  };

  return (
    <div className="flex items-center justify-between gap-2.5 w-full text-xs">
      {/* 1. Step & Playback */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => jumpToPhase(554)}
          title="Reset Pre-Open (09:14)"
          className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          onClick={() => stepBackward(5)}
          title="-5 min"
          className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
        >
          <SkipBack className="w-3 h-3" />
        </button>
        <button
          onClick={togglePlay}
          className={`px-2.5 py-1 rounded text-xs font-black flex items-center gap-1.5 transition ${
            isPlaying
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
              <Play className="w-3 h-3 fill-current" /> PLAY
            </>
          )}
        </button>
        <button
          onClick={() => stepForward(5)}
          title="+5 min"
          className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground transition border border-surface-border"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* 2. Clock & Quick Phase Jump Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-surface-muted border border-surface-border rounded">
          <Clock className="w-3 h-3 text-foreground/50" />
          <span className="font-bold text-foreground tracking-wide">
            {timeFormatted}
          </span>
        </div>

        <MarketPhaseJumpButtons onJump={jumpToPhase} />
      </div>

      {/* 3. Timeline Slider */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-foreground/40 shrink-0">09:14</span>
        <input
          type="range"
          min={554}
          max={930}
          step={1}
          value={localTime}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          onKeyUp={handleSliderCommit}
          className="w-full h-1 bg-surface-border rounded appearance-none cursor-pointer accent-foreground"
        />
        <span className="text-[10px] text-foreground/40 shrink-0">15:30</span>
      </div>

      {/* 4. Speed Multipliers */}
      <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5 shrink-0">
        {[1, 2, 5, 10].map((spd) => (
          <button
            key={spd}
            onClick={() => setPlaybackSpeed(spd)}
            className={`px-1.5 py-0.2 text-[10px] font-medium rounded transition ${
              playbackSpeed === spd
                ? "bg-foreground text-background font-bold"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>
    </div>
  );
};
