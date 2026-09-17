"use client";

import React from "react";
import { BrandNavigation } from "./components/BrandNavigation";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { BreadthIndicator } from "./components/BreadthIndicator";
import { ThemeToggle } from "./components/ThemeToggle";
import { useHeaderState } from "./hooks/useHeaderState";

export const HeaderControls: React.FC = () => {
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

  return (
    <header className="border-b border-surface-border bg-surface select-none shrink-0 transition-colors">
      <div className="px-5 py-2.5 flex items-center justify-between">
        <BrandNavigation activeCount={activeCount} />

        <div className="flex items-center gap-3">
          <ModeSwitcher
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
          />

          <BreadthIndicator breadth={breadth} />

          <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        </div>
      </div>
    </header>
  );
};
