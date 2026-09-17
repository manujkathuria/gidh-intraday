"use client";

import React, { useState } from "react";
import { ALL_DOCS, DocArticle } from "../data/docs";
import { DocContentRenderer } from "./DocContentRenderer";
import { Clock, PanelLeftClose, PanelLeft } from "lucide-react";

export const DocsView: React.FC = () => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(ALL_DOCS[0].id);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);

  const activeArticle = ALL_DOCS.find((a) => a.id === selectedArticleId) || ALL_DOCS[0];

  // Group articles by category
  const quantDocs = ALL_DOCS.filter((d) => d.category === "quant");
  const backendDocs = ALL_DOCS.filter((d) => d.category === "backend");

  const renderDocGroup = (groupTitle: string, docs: DocArticle[]) => (
    <div className="flex flex-col gap-1 mb-4 last:mb-0">
      <h3 className="text-[12px] font-bold text-foreground tracking-tight px-1 mb-0.5">
        {groupTitle}
      </h3>
      <div className="relative pl-3 border-l border-surface-border flex flex-col gap-0.5 ml-1.5">
        {docs.map((article) => {
          const isSelected = article.id === selectedArticleId;

          return (
            <button
              key={article.id}
              onClick={() => setSelectedArticleId(article.id)}
              className={`group relative text-left py-1 px-2 rounded-sm transition-colors cursor-pointer text-[12px] flex items-center ${
                isSelected
                  ? "text-blue-500 font-semibold"
                  : "text-foreground/65 hover:text-foreground hover:bg-surface-hover/50"
              }`}
            >
              {/* Active Indicator Dot on the border line */}
              {isSelected && (
                <span className="absolute -left-[15px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-background" />
              )}
              <span className="truncate">{article.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-[75vh] w-full select-text relative">
      {/* 1. Minimal Clean Tree Sidebar */}
      <div
        className={`shrink-0 flex flex-col select-none transition-all duration-200 ${
          isNavOpen ? "w-full md:w-64" : "w-full md:w-10"
        }`}
      >
        {/* Sidebar Header with Collapse Button */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border">
          {isNavOpen ? (
            <>
              <span className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider">
                Documentation
              </span>
              <button
                onClick={() => setIsNavOpen(false)}
                title="Collapse Sidebar"
                className="p-1 rounded text-foreground/50 hover:text-foreground hover:bg-surface-hover transition cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsNavOpen(true)}
              title="Expand Sidebar"
              className="w-full flex justify-center py-1 text-foreground/70 hover:text-foreground transition cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tree Groups */}
        {isNavOpen && (
          <div className="flex flex-col overflow-y-auto custom-scrollbar pr-1">
            {renderDocGroup("Quant AI Brains", quantDocs)}
            {renderDocGroup("Backend Streaming", backendDocs)}
          </div>
        )}
      </div>

      {/* 2. Main Article Viewer */}
      <div className="flex-1 min-w-0 bg-surface border border-surface-border rounded-sm p-4 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="border-b border-surface-border pb-3 flex flex-col gap-1.5">
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

        <DocContentRenderer content={activeArticle.content} />
      </div>
    </div>
  );
};
