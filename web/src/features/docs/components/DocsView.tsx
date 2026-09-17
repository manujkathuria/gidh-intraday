"use client";

import React, { useState } from "react";
import { ALL_DOCS, DocArticle } from "../data/docs";
import { DocContentRenderer } from "./DocContentRenderer";
import {
  Clock,
  PanelLeft,
  Brain,
  Code2,
  TrendingUp,
  Activity,
  KeyRound,
  Gauge,
  Binary,
  Database,
  LucideIcon,
} from "lucide-react";

const DOC_ICONS: Record<string, LucideIcon> = {
  "quant-architecture": Brain,
  "quant-brain-protocol": Code2,
  "quant-brain-1-macro": TrendingUp,
  "backend-architecture": Activity,
  "backend-auth-service": KeyRound,
  "backend-live-engine": Gauge,
  "backend-feature-calculator": Binary,
  "backend-eod-batch": Database,
};

export const DocsView: React.FC = () => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(ALL_DOCS[0].id);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeArticle = ALL_DOCS.find((a) => a.id === selectedArticleId) || ALL_DOCS[0];
  const quantDocs = ALL_DOCS.filter((d) => d.category === "quant");
  const backendDocs = ALL_DOCS.filter((d) => d.category === "backend");

  const renderNavGroup = (groupTitle: string, docs: DocArticle[]) => (
    <div className="flex flex-col gap-0.5 mb-3 last:mb-0">
      {!isCollapsed && (
        <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider px-2.5 pt-1.5 pb-1 select-none">
          {groupTitle}
        </span>
      )}
      {docs.map((article) => {
        const isActive = article.id === selectedArticleId;
        const Icon = DOC_ICONS[article.id] || Brain;

        return (
          <button
            key={article.id}
            onClick={() => setSelectedArticleId(article.id)}
            title={isCollapsed ? article.shortTitle : undefined}
            className={`transition-colors flex items-center group whitespace-nowrap h-8 rounded-sm relative cursor-pointer ${
              isCollapsed ? "justify-center w-full" : "px-2.5 justify-start w-full"
            } ${isActive ? "text-foreground font-bold" : "text-foreground/60 hover:text-foreground hover:bg-surface-hover/50"}`}
          >
            {/* Active Left Indicator Bar - Identical to Main App */}
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-full" />
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-foreground" : "text-foreground/50 group-hover:text-foreground"}`} />
              {!isCollapsed && <span className="tracking-wide truncate text-xs">{article.shortTitle}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden select-text relative">
      {/* 1. Sidebar Rail (Identical Styling to Main App) */}
      <aside className={`bg-surface border-r border-surface-border flex flex-col shrink-0 z-20 select-none p-2.5 transition-all duration-200 ${isCollapsed ? "w-14" : "w-56"}`}>
        <div className="flex flex-col gap-2 min-w-0 h-full">
          {/* Top Sidebar Header with Collapse Button */}
          <div className={`flex items-center h-8 pb-2 border-b border-surface-border ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
            {!isCollapsed && (
              <span className="font-extrabold text-xs tracking-wider text-foreground select-none uppercase whitespace-nowrap">
                DOCUMENTATION
              </span>
            )}
            <button
              onClick={() => setIsCollapsed((p) => !p)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1.5 rounded-md hover:bg-surface-hover text-foreground/70 hover:text-foreground transition flex items-center justify-center cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pt-1 pr-0.5">
            {renderNavGroup("Quant AI Brains", quantDocs)}
            {renderNavGroup("Backend Streaming", backendDocs)}
          </nav>
        </div>
      </aside>

      {/* 2. Main Article Viewer */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-background flex flex-col gap-4 w-full">
        <div className="border-b border-surface-border pb-3 flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between text-[10px] text-foreground/45 uppercase tracking-wider">
            <span className="px-1.5 py-0.5 rounded-sm bg-surface-muted border border-surface-border text-foreground/70 font-bold uppercase">
              {activeArticle.category}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" />
              {activeArticle.readTime}
            </span>
          </div>

          <h1 className="text-base font-extrabold text-foreground uppercase tracking-tight">
            {activeArticle.title}
          </h1>

          <p className="text-[11px] text-foreground/50 leading-normal">
            {activeArticle.description}
          </p>
        </div>

        <div className="w-full">
          <DocContentRenderer content={activeArticle.content} />
        </div>
      </main>
    </div>
  );
};
