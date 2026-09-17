"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sun, Moon } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export const DocShell: React.FC<Props> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gidh-theme");
    const prefersDark = savedTheme ? savedTheme === "dark" : true;
    setIsDark(prefersDark);
    const root = document.documentElement;
    if (prefersDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const root = document.documentElement;
    if (nextDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("gidh-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("gidh-theme", "light");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Dedicated Institutional Docs Header Bar */}
      <header className="h-11 shrink-0 border-b border-surface-border bg-surface px-4 flex items-center justify-between select-none z-30">
        <div className="flex items-center gap-3">
          {/* Back to War Room Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold text-foreground/80 hover:text-foreground bg-surface-muted hover:bg-surface-hover border border-surface-border transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-foreground/60" />
            <span>War Room</span>
          </Link>

          <div className="h-4 w-px bg-surface-border" />

          {/* Doc Title & Branding */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-foreground/80" />
            <span className="font-extrabold text-xs tracking-wider uppercase text-foreground">
              GIDH DOCS
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-muted border border-surface-border text-foreground/50 font-semibold uppercase tracking-wider">
              AI & Architecture Specs
            </span>
          </div>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
            className="p-1.5 rounded-sm hover:bg-surface-hover text-foreground/70 hover:text-foreground transition cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Documentation Viewport */}
      <main className="flex-1 overflow-hidden flex flex-col bg-background">
        {children}
      </main>
    </div>
  );
};
