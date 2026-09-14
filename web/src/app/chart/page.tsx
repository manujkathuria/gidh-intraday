import React, { Suspense } from "react";
import { HeaderControls } from "@/features/header";
import { ChartStudio } from "@/features/chart";

export const metadata = {
  title: "Candlestick Charts | Gidh Intraday War Room",
  description: "Real-Time 1-Minute Intraday Candlestick & Volume Studio",
};

export default function ChartPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      <HeaderControls />
      <Suspense
        fallback={
          <div className="p-8 font-mono text-xs text-foreground/40">
            Loading Candlestick Studio...
          </div>
        }
      >
        <ChartStudio />
      </Suspense>
    </main>
  );
}
