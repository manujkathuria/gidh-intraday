"use client";

import React, { useState } from "react";
import { NavigationItems } from "./components/NavigationItems";
import { SidebarFooterStatus } from "./components/SidebarFooterStatus";
import { MobileDrawerSidebar } from "./components/MobileDrawerSidebar";
import { BottomCockpitFooter } from "./components/BottomCockpitFooter";
import { useHeaderState } from "./hooks/useHeaderState";

import { AppBreadcrumbs } from "./components/AppBreadcrumbs";

interface Props {
  children: React.ReactNode;
}

export const AppShell: React.FC<Props> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const {
    mode,
    setMode,
    sessions,
    selectedDate,
    setSelectedDate,
    currentTimeMinutes,
    setCurrentTimeMinutes,
    localTime,
    setLocalTime,
    handleSliderChange,
    handleSliderCommit,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    snapshot,
    activeCount,
    isDark,
    toggleTheme,
    liveClock,
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
        breadth={breadth}
      />

      {/* 2. Desktop / iPad Rail (Hidden on mobile, visible md+) */}
      <aside
        className={`hidden md:flex bg-surface border-r border-surface-border flex-col justify-between transition-all duration-200 shrink-0 z-20 ${isCollapsed ? "w-14 p-2" : "w-52 p-3.5"
          }`}
      >
        <div className="flex flex-col gap-4">
          {/* Navigation Links (No Branding Clutter) */}
          <NavigationItems activeCount={activeCount} isCollapsed={isCollapsed} />
        </div>

        {/* Footer Status */}
        <SidebarFooterStatus breadth={breadth} isCollapsed={isCollapsed} />
      </aside>

      {/* 3. Main Workspace Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Main Content Body: Starts directly at Top 0px with Ultra-Compact Breadcrumbs */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-3 pt-1.5 pb-3 md:px-4 md:pt-1.5 md:pb-4 gap-1.5">
          <AppBreadcrumbs
            isCollapsed={isCollapsed}
            onToggleSidebar={handleToggleSidebar}
            mode={mode}
            liveClock={liveClock}
            localTime={localTime}
            isDark={isDark}
            toggleTheme={toggleTheme}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
          />
          {children}
        </main>


        {/* Unified Bottom Cockpit Footer (Controls, Scrubber, Mode, Menu) */}
        <BottomCockpitFooter
          isCollapsed={isCollapsed}
          toggleSidebar={handleToggleSidebar}
          mode={mode}
          setMode={setMode}
          localTime={localTime}
          setLocalTime={setLocalTime}
          setCurrentTimeMinutes={setCurrentTimeMinutes}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          stepBackward={stepBackward}
          stepForward={stepForward}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          handleSliderChange={handleSliderChange}
          handleSliderCommit={handleSliderCommit}
        />

      </div>
    </div>
  );
};

