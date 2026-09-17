"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { MermaidRenderer } from "./MermaidRenderer";

interface Props {
  content: string;
}

export const DocContentRenderer: React.FC<Props> = ({ content }) => {
  return (
    <div className="w-full text-foreground/90 text-[13px] leading-relaxed font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: () => null,
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-foreground border-b border-surface-border/60 pb-1.5 mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-foreground/90 uppercase tracking-wide mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground/80 leading-relaxed my-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-3 pl-1 text-foreground/80">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-3 pl-1 text-foreground/80">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/80 leading-normal">{children}</li>
          ),
          code: ({ children, className }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isMermaid = match && match[1] === "mermaid";
            const isBlock = Boolean(match);

            if (isMermaid) {
              return <MermaidRenderer chart={String(children).trim()} />;
            }

            if (isBlock) {
              return (
                <code className="block bg-background border border-surface-border rounded-md p-3.5 font-mono text-[11px] text-foreground/90 overflow-x-auto my-3 leading-snug">
                  {children}
                </code>
              );
            }

            return (
              <code className="px-1.5 py-0.5 rounded bg-surface-muted text-foreground border border-surface-border text-[11px] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-foreground/40 pl-3.5 my-3 text-foreground/70 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-surface-border rounded-md">
              <table className="w-full text-xs text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-muted border-b border-surface-border text-foreground font-bold tracking-wide uppercase text-[11px]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-surface-border text-foreground/85">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-surface-hover/50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 border-r border-surface-border last:border-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-r border-surface-border last:border-0 text-foreground/80">
              {children}
            </td>
          ),
          hr: () => <hr className="border-surface-border my-6" />,
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
