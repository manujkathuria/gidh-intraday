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

  return (
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
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition ${
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
          onChange={(e) => handleSliderChange(Number(e.target.value))}
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
            className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition ${
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
