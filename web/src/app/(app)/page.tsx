import React, { Suspense } from "react";
import { RadarLeaderboard } from "@/features/radar";

export const metadata = {
  title: "Radar Leaderboard | Gidh Intraday War Room",
  description: "Real-Time 210-Civ Market Scouting & Replay Engine",
};

export default function ReplayWarRoom() {
  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col">
      <Suspense
        fallback={
          <div className="p-8 text-xs text-foreground/40">
            Loading Radar Leaderboard...
          </div>
        }
      >
        <RadarLeaderboard />
      </Suspense>
    </div>
  );
}
