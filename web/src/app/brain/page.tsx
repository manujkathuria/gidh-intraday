import React, { Suspense } from "react";
import { QuantBrainView } from "@/features/brain";

export const metadata = {
  title: "Quant Brain | Gidh Intraday War Room",
  description: "Distilled Operating Intelligence and Active Trading Rules",
};

export default function BrainPage() {
  return (
    <div className="w-full px-5 py-3 flex-1 flex flex-col">
      <Suspense
        fallback={
          <div className="p-8 text-xs text-foreground/40">
            Loading Quant Brain Engine...
          </div>
        }
      >
        <QuantBrainView />
      </Suspense>
    </div>
  );
}

