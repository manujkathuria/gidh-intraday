"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";

interface Props {
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<Props> = ({ isDark, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
      className="p-1.5 rounded bg-surface-muted hover:bg-surface-hover text-foreground/70 hover:text-foreground border border-surface-border transition"
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-foreground/80" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-foreground/80" />
      )}
    </button>
  );
};
