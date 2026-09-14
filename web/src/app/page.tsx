"use client";

import React, { useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { HeaderControls } from "@/components/HeaderControls";
import { IntradayVolumeTable } from "@/components/IntradayVolumeTable";

export default function ReplayWarRoom() {
  const { init } = useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      {/* 1. Header Controls with Theme Toggle & Scrubber */}
      <HeaderControls />

      {/* 2. Main High-Density Monochrome Table */}
      <div className="w-full px-5 py-3 flex-1 flex flex-col">
        <IntradayVolumeTable />
      </div>
    </main>
  );
}
