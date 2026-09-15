import React, { Suspense } from "react";
import { ChartStudio } from "@/features/chart";

export const metadata = {
  title: "Chart Studio | Gidh Intraday War Room",
  description: "High-Performance Candlestick & Volume Profile Studio",
};

export default function ChartPage() {
  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden">
      <Suspense
        fallback={
          <div className="p-8 text-xs text-foreground/40">
            Loading Chart Studio...
          </div>
        }
      >
        <ChartStudio />
      </Suspense>
    </div>
  );
}

