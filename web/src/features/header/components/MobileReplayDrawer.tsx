"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Play, Pause, RotateCcw, Clock, X } from "lucide-react";
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

export const MobileReplayDrawer: React.FC<Props> = ({
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
  const [isOpen, setIsOpen] = useState(false);
  const timeFormatted = formatMinutesToTime(localTime).slice(0, 5);

  const jumpToPhase = (minutes: number) => {
    setLocalTime(minutes);
    setCurrentTimeMinutes(minutes);
  };

  return (
    <div className="relative">
      {/* Trigger Button on Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-muted border border-surface-border text-foreground hover:bg-surface-hover font-bold text-xs"
      >
        <Clock className="w-3 h-3 text-foreground/60" />
        <span>{timeFormatted}</span>
        <SlidersHorizontal className="w-3 h-3 text-foreground/40 ml-0.5" />
      </button>

      {/* Floating Popover Panel for Mobile */}
      {isOpen && (
        <div className="absolute top-10 right-0 w-[calc(100vw-24px)] max-w-sm bg-surface border border-surface-border rounded-xl shadow-2xl p-3.5 z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-foreground/50" />
              Replay Timeline ({timeFormatted})
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-foreground/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-foreground/40">
              <span>09:14 Pre-Open</span>
              <span>15:30 Close</span>
            </div>
            <input
              type="range"
              min={554}
              max={930}
              step={1}
              value={localTime}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              className="w-full h-1.5 bg-surface-border rounded appearance-none cursor-pointer accent-foreground"
            />
          </div>

          {/* Playback Controls & Speed */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => jumpToPhase(554)}
                className="p-2 rounded bg-surface-muted border border-surface-border text-foreground/70"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={togglePlay}
                className={`px-3 py-1.5 rounded text-xs font-black flex items-center gap-1.5 ${
                  isPlaying
                    ? "bg-foreground text-background"
                    : "bg-surface-muted border border-surface-border text-foreground"
                }`}
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                {isPlaying ? "PAUSE" : "PLAY"}
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center bg-surface-muted border border-surface-border rounded p-0.5">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 text-[11px] font-bold rounded ${
                    playbackSpeed === spd
                      ? "bg-foreground text-background"
                      : "text-foreground/50"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Market Phase Jump Buttons */}
          <div className="pt-1">
            <MarketPhaseJumpButtons onJump={jumpToPhase} />
          </div>
        </div>
      )}
    </div>
  );
};
