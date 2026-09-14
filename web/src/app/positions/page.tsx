import React, { Suspense } from "react";
import { HeaderControls } from "@/features/header";
import { PositionsTerminal } from "@/features/positions";

export const metadata = {
  title: "Positions & Orders | Gidh Intraday War Room",
  description: "Live 5-Slot MIS Leveraged Execution Terminal",
};

export default function PositionsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />
      <Suspense
        fallback={
          <div className="p-8 font-mono text-xs text-foreground/40">
            Loading Live Positions Terminal...
          </div>
        }
      >
        <PositionsTerminal />
      </Suspense>
    </main>
  );
}
