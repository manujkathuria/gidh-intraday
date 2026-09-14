"use client";

import React, { useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { HeaderControls } from "@/components/HeaderControls";
import { SectorFormationTable } from "@/components/SectorFormationTable";

export default function SectorBattalionsPage() {
  const { init } = useReplayStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      {/* 1. Header Controls with Global Navigation */}
      <HeaderControls />

      {/* 2. Sector Battalion Formations Table */}
      <div className="w-full px-5 py-3 flex-1 flex flex-col">
        <SectorFormationTable />
      </div>
    </main>
  );
}
