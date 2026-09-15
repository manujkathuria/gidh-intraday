"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { NavigationItems } from "./NavigationItems";
import { SidebarFooterStatus } from "./SidebarFooterStatus";
import { SidebarModeSwitcher } from "./SidebarModeSwitcher";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeCount: number;
  breadth: number;
  mode: "LIVE" | "REPLAY";
  setMode: (mode: "LIVE" | "REPLAY") => void;
}

export const MobileDrawerSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  activeCount,
  breadth,
  mode,
  setMode,
}) => {
  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden select-none">
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* 2. Slide-Over Panel */}
      <aside className="fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-surface border-r border-surface-border shadow-2xl flex flex-col justify-between p-4 z-10 animate-in slide-in-from-left duration-200">
        <div className="flex flex-col gap-4">
          {/* Header with Title & Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
              aria-label="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <SidebarModeSwitcher
            mode={mode}
            setMode={setMode}
            isCollapsed={false}
          />

          {/* Navigation Items (auto-close on click handled in links) */}
          <div onClick={onClose}>
            <NavigationItems activeCount={activeCount} isCollapsed={false} />
          </div>
        </div>


        {/* Footer Breadth & Engine Status */}
        <SidebarFooterStatus breadth={breadth} isCollapsed={false} />
      </aside>
    </div>
  );
};
