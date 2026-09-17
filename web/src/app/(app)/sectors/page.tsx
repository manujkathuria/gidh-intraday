import React, { Suspense } from "react";
import { SectorBattalionsTerminal } from "@/features/sectors";

export const metadata = {
  title: "Sector Battalions | Gidh Intraday War Room",
  description: "Real-Time Sector Momentum & Relative Strength Matrix",
};

export default function SectorsPage() {
  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col">
      <Suspense
        fallback={
          <div className="p-8 text-xs text-foreground/40">
            Loading Sector Formations...
          </div>
        }
      >
        <SectorBattalionsTerminal />
      </Suspense>
    </div>
  );
}
