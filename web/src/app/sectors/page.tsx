import React, { Suspense } from "react";
import { HeaderControls } from "@/features/header";
import { SectorBattalionsTerminal } from "@/features/sectors";

export const metadata = {
  title: "Sector Battalions | Gidh Intraday War Room",
  description: "Sector Relative Strength & Intra-Sector Formation Heatmap",
};

export default function SectorBattalionsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />
      <div className="w-full px-5 py-3 flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="p-8 font-mono text-xs text-foreground/40">
              Loading Sector Battalions...
            </div>
          }
        >
          <SectorBattalionsTerminal />
        </Suspense>
      </div>
    </main>
  );
}
