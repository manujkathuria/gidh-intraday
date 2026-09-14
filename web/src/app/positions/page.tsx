import React, { Suspense } from "react";
import { PositionsTerminal } from "@/features/positions";

export const metadata = {
  title: "Positions & Orders | Gidh Intraday War Room",
  description: "Live 5-Slot MIS Leveraged Execution Terminal",
};

export default function PositionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-xs text-foreground/40">
          Loading Live Positions Terminal...
        </div>
      }
    >
      <PositionsTerminal />
    </Suspense>
  );
}
