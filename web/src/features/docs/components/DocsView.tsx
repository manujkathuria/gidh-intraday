"use client";

import React, { useState } from "react";
import { BACKEND_DOCS } from "../data/docs";
import { DocContentRenderer } from "./DocContentRenderer";
import { BookOpen, Clock, ChevronRight, PanelLeftClose, PanelLeft, Menu } from "lucide-react";

export const DocsView: React.FC = () => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(BACKEND_DOCS[0].id);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);
  const activeArticle = BACKEND_DOCS.find((a) => a.id === selectedArticleId) || BACKEND_DOCS[0];

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-2.5 h-full min-h-[75vh] w-full select-text relative">
      {/* 1. Collapsible Document Index (Desktop Sidebar + Mobile Drawer Toggle) */}
      <div
        className={`shrink-0 flex flex-col gap-1.5 select-none transition-all duration-200 ${
          isNavOpen ? "w-full md:w-64" : "w-full md:w-10"
        }`}
      >
        {/* Index Header with Collapse / Expand Toggle */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface border border-surface-border rounded-sm">
          {isNavOpen ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
                  Architecture
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-muted border border-surface-border text-foreground/50 tabular-nums font-semibold">
                  {BACKEND_DOCS.length}
                </span>
                <button
                  onClick={() => setIsNavOpen(false)}
                  title="Collapse Index"
                  className="p-1 rounded text-foreground/60 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsNavOpen(true)}
              title="Expand Index"
              className="w-full flex justify-center py-0.5 text-foreground/70 hover:text-foreground transition cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Index Articles List */}
        {isNavOpen && (
          <div className="flex flex-col gap-0.5 bg-surface border border-surface-border rounded-sm p-1">
            {BACKEND_DOCS.map((article, idx) => {
              const isSelected = article.id === selectedArticleId;

              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticleId(article.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-sm text-left transition-colors cursor-pointer text-[11px] ${
                    isSelected
                      ? "bg-foreground text-background font-bold"
                      : "text-foreground/70 hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] tabular-nums ${isSelected ? "text-background/70" : "text-foreground/40"}`}>
                      0{idx + 1}
                    </span>
                    <span className="truncate">{article.title}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 shrink-0 ${isSelected ? "text-background" : "text-foreground/20"}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Main Article Viewer */}
      <div className="flex-1 min-w-0 bg-surface border border-surface-border rounded-sm p-4 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="border-b border-surface-border pb-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-foreground/45 uppercase tracking-wider">
            <span className="px-1.5 py-0.5 rounded-sm bg-surface-muted border border-surface-border text-foreground/70 font-bold">
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

        <DocContentRenderer content={activeArticle.content} />
      </div>
    </div>
  );
};
