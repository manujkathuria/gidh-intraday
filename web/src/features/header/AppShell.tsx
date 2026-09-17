"use client";

import React, { useState } from "react";
import { PanelLeft } from "lucide-react";
import { NavigationItems } from "./components/NavigationItems";
import { SidebarFooterStatus } from "./components/SidebarFooterStatus";
import { MobileDrawerSidebar } from "./components/MobileDrawerSidebar";
import { useHeaderState } from "./hooks/useHeaderState";
import { AppBreadcrumbs } from "./components/AppBreadcrumbs";

interface Props {
  children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const {
    sessions,
    selectedDate,
    setSelectedDate,
    snapshot,
    activeCount,
    isDark,
    toggleTheme,
  } = useHeaderState();

  const breadth = snapshot?.weather?.pct_above_vwap ?? 0;

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* 1. Mobile Drawer Slide-Over (Phones: < md) */}
      <MobileDrawerSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        activeCount={activeCount}
      />

      {/* 2. Desktop / iPad Rail (Hidden on mobile, visible md+) */}
      <aside
        className={`hidden md:flex bg-surface border-r border-surface-border flex-col justify-between shrink-0 z-20 select-none p-2.5 ${
          isCollapsed ? "w-14" : "w-52"
        }`}
      >
        <div className="flex flex-col gap-2 min-w-0">
          {/* Top Sidebar Header with Collapse Button & Brand */}
          <div
            className={`flex items-center h-8 pb-2 border-b border-surface-border ${
              isCollapsed ? "justify-center" : "justify-between px-1"
            }`}
          >
            {!isCollapsed && (
              <span className="font-extrabold text-xs tracking-wider text-foreground select-none uppercase whitespace-nowrap">
                GIDH WAR ROOM
              </span>
            )}
            <button
              onClick={handleToggleSidebar}
              title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
              className="p-1.5 rounded-md hover:bg-surface-hover text-foreground/70 hover:text-foreground transition flex items-center justify-center cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <NavigationItems activeCount={activeCount} isCollapsed={isCollapsed} />
        </div>

        {/* Bottom Section: Edge Engine Status */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-border">
          <SidebarFooterStatus isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* 3. Main Workspace Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Main Content Body: Starts directly at Top 0px with Ultra-Compact Breadcrumbs */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-3 pt-1.5 pb-3 md:px-4 md:pt-1.5 md:pb-4 gap-1.5">
          <AppBreadcrumbs
            isCollapsed={isCollapsed}
            onToggleSidebar={handleToggleSidebar}
            breadth={breadth}
            isDark={isDark}
            toggleTheme={toggleTheme}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
          />
          {children}
        </main>
      </div>
    </div>
  );
};
