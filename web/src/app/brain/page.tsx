import React, { Suspense } from "react";
import { HeaderControls } from "@/features/header";
import { QuantBrainView } from "@/features/brain";

export const metadata = {
  title: "Quant Brain | Gidh Intraday War Room",
  description: "Distilled Operating Intelligence and Active Trading Rules",
};

export default function BrainPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />
      <Suspense
        fallback={
          <div className="p-8 font-mono text-xs text-foreground/40">
            Loading Quant Brain Engine...
          </div>
        }
      >
        <QuantBrainView />
      </Suspense>
    </main>
  );
}
