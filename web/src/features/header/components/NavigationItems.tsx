"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Shield, CandlestickChart, Brain, Zap } from "lucide-react";

interface Props {
  activeCount: number;
  isCollapsed: boolean;
}

export const NavigationItems: React.FC<Props> = ({ activeCount, isCollapsed }) => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Radar", icon: Radar, badge: null },
    { href: "/sectors", label: "Sectors", icon: Shield, badge: null },
    { href: "/chart", label: "Charts", icon: CandlestickChart, badge: null },
    { href: "/brain", label: "Quant Brain", icon: Brain, badge: null },
    { href: "/positions", label: "Positions", icon: Zap, badge: `${activeCount}/5` },
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
            className={`rounded-lg transition-all flex items-center group border ${
              isCollapsed ? "p-2.5 justify-center" : "px-3 py-2 justify-between"
            } ${
              isActive
                ? "bg-foreground text-background font-black border-foreground shadow-sm"
                : "bg-transparent border-transparent text-foreground/60 hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="tracking-wide">{item.label}</span>}
            </div>

            {!isCollapsed && item.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded border ${
                  isActive
                    ? "bg-background text-foreground border-background font-black"
                    : "bg-surface border-surface-border text-foreground/60"
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
