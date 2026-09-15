"use client";

import React from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { formatMinutesToTime } from "@/stores/replayStore";
import { MobileReplayDrawer } from "./MobileReplayDrawer";

interface Props {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  mode: "LIVE" | "REPLAY";
  setMode: (mode: "LIVE" | "REPLAY") => void;
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

export const BottomCockpitFooter: React.FC<Props> = ({
  isCollapsed,
  toggleSidebar,
  mode,
  setMode,
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

  if (mode === "LIVE") {
    return null;
  }

  const timeFormatted = formatMinutesToTime(localTime).slice(0, 5);

  return (
    <footer className="h-11 px-3 bg-surface border-t border-surface-border flex items-center justify-between md:justify-center gap-3 select-none shrink-0 z-30 text-xs shadow-lg">
      {/* Center: Replay Scrubber & Speed Controls (md+) */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-3 max-w-2xl min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => stepBackward(5)}
            title="-5 min"
            className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 border border-surface-border cursor-pointer"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <button
            onClick={togglePlay}
            className={`px-2.5 py-0.5 rounded text-xs font-black flex items-center gap-1 transition cursor-pointer ${
              isPlaying
                ? "bg-foreground text-background"
                : "bg-surface-muted hover:bg-surface-hover text-foreground border border-surface-border"
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
          </button>
          <button
            onClick={() => stepForward(5)}
            title="+5 min"
            className="p-1 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 border border-surface-border cursor-pointer"
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
              className={`px-1.5 py-0.2 text-[10px] font-bold rounded cursor-pointer ${
                playbackSpeed === spd ? "bg-foreground text-background" : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Replay Controls Drawer Trigger */}
      <div className="md:hidden flex items-center justify-between w-full">
        <span className="font-bold text-foreground text-xs">{timeFormatted}</span>
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
    </footer>
  );
};


