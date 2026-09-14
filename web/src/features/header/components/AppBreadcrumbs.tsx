"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";

export const AppBreadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol");

  const routeNames: Record<string, string> = {
    "/": "Radar",
    "/sectors": "Sectors",
    "/chart": "Charts",
    "/brain": "Quant Brain",
    "/positions": "Positions",
  };

  const currentRouteName = routeNames[pathname] || "Radar";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs select-none mb-3">
      <ol role="list" className="flex items-center space-x-2">
        {/* Home / Root */}
        <li>
          <div>
            <Link
              href="/"
              className="text-foreground/40 hover:text-foreground transition flex items-center"
              title="Home"
            >
              <Home aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>

        {/* Current Primary Route (including Radar on root '/') */}
        <li>
          <div className="flex items-center space-x-2">
            <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-foreground/30" />
            <Link
              href={pathname}
              aria-current={!symbolParam ? "page" : undefined}
              className={`font-medium transition ${
                !symbolParam
                  ? "text-foreground font-bold"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {currentRouteName}
            </Link>
          </div>
        </li>

        {/* Optional Sub-entity: Active Symbol if on /chart */}
        {symbolParam && (
          <li>
            <div className="flex items-center space-x-2">
              <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-foreground/30" />
              <span aria-current="page" className="font-bold text-foreground">
                {symbolParam}
              </span>
            </div>
          </li>
        )}
      </ol>
    </nav>
  );
};
