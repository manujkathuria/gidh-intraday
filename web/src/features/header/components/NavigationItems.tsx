"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, Layers, LineChart, Brain, Briefcase, TrendingUp } from "lucide-react";

interface Props {
  activeCount: number;
  isCollapsed: boolean;
}

export const NavigationItems: React.FC<Props> = ({ activeCount, isCollapsed }) => {
  const pathname = usePathname();

  const links = [
    { href: "/macro", label: "Macro", icon: TrendingUp, badge: null },
    { href: "/", label: "Radar", icon: Crosshair, badge: null },
    { href: "/sectors", label: "Sectors", icon: Layers, badge: null },
    { href: "/chart", label: "Charts", icon: LineChart, badge: null },
    { href: "/brain", label: "Brain", icon: Brain, badge: null },
    { href: "/positions", label: "Positions", icon: Briefcase, badge: `${activeCount}/5` },
  ];

  return (
    <nav className="flex flex-col gap-1 w-full text-xs">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ""}` : undefined}
            className={`transition-colors flex items-center group whitespace-nowrap h-8 rounded-sm relative ${
              isCollapsed ? "justify-center w-full" : "px-2.5 justify-between w-full"
            } ${
              isActive
                ? "text-foreground font-bold"
                : "text-foreground/60 hover:text-foreground hover:bg-surface-hover/50"
            }`}
          >
            {/* Active Left Indicator Bar */}
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-full" />
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-foreground" : "text-foreground/50 group-hover:text-foreground"}`} />
              {!isCollapsed && <span className="tracking-wide truncate text-xs">{item.label}</span>}
            </div>

            {!isCollapsed && item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                  isActive
                    ? "bg-surface border-surface-border text-foreground font-bold"
                    : "bg-surface/50 border-surface-border/50 text-foreground/50"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
