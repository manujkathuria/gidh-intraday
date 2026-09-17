import React, { Suspense } from "react";
import { DocsView } from "@/features/docs";

export const metadata = {
  title: "System Architecture & Docs | Gidh Intraday War Room",
  description: "High-throughput Streaming Pipeline, Ingest Engine, and Mathematical Specifications",
};

export default function DocsPage() {
  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <Suspense
        fallback={
          <div className="p-8 text-xs text-foreground/40">
            Loading System Documentation...
          </div>
        }
      >
        <DocsView />
      </Suspense>
    </div>
  );
}
