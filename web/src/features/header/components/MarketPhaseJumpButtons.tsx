import React from "react";

interface Props {
  onJump: (minutes: number) => void;
}

export const MarketPhaseJumpButtons: React.FC<Props> = ({ onJump }) => (
  <div className="hidden lg:flex items-center gap-1 text-[10px]">
    <button
      onClick={() => onJump(570)}
      className="px-1.5 py-0.2 rounded border border-surface-border bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground"
      title="Jump to 09:30 AM (Opening Range Breakout)"
    >
      09:30 ORB
    </button>
    <button
      onClick={() => onJump(690)}
      className="px-1.5 py-0.2 rounded border border-surface-border bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground"
      title="Jump to 11:30 AM (Midday Trend)"
    >
      11:30 MID
    </button>
    <button
      onClick={() => onJump(840)}
      className="px-1.5 py-0.2 rounded border border-surface-border bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground"
      title="Jump to 02:00 PM (Power Hour Squeeze)"
    >
      14:00 POWER
    </button>
  </div>
);
