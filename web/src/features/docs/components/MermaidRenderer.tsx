"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface Props {
  chart: string;
}

export const MermaidRenderer: React.FC<Props> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const renderDiagram = async () => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";

    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: "transparent",
            mainBkg: "#181B21",
            textColor: "#DBE0E9",
            nodeTextColor: "#DBE0E9",
            nodeBorder: "#303640",
            lineColor: "#485464",
            edgeLabelBackground: "#181B21",
            clusterBkg: "#111317",
            clusterBorder: "#303640",
            titleColor: "#94A3B8",
            defaultLinkColor: "#485464",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            fontSize: "11.5px",
          }
        : {
            darkMode: false,
            background: "transparent",
            mainBkg: "#FFFFFF",
            textColor: "#272D36",
            nodeTextColor: "#272D36",
            nodeBorder: "#DADEE5",
            lineColor: "#8C96A5",
            edgeLabelBackground: "#FFFFFF",
            clusterBkg: "#F6F8FA",
            clusterBorder: "#DADEE5",
            titleColor: "#64748B",
            defaultLinkColor: "#8C96A5",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            fontSize: "11.5px",
          },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 16,
        nodeSpacing: 35,
        rankSpacing: 40,
        useMaxWidth: false,
      },
      securityLevel: "loose",
    });

    try {
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      const { svg: renderedSvg } = await mermaid.render(id, chart);
      
      // Completely strip defs containing drop shadows, filter tags, and filter references
      const cleaned = renderedSvg
        .replace(/<defs>[\s\S]*?<\/defs>/gi, "")
        .replace(/filter="[^"]*"/gi, "")
        .replace(/style="[^"]*filter:[^"]*"/gi, "")
        .replace(/class="[^"]*drop-shadow[^"]*"/gi, "");

      setSvg(cleaned);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to render diagram");
    }
  };

  useEffect(() => {
    renderDiagram();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class" || m.attributeName === "data-theme") {
          renderDiagram();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, [chart]);

  if (error) {
    return (
      <div className="p-3 my-2 bg-surface border border-surface-border text-foreground/40 text-xs rounded-md">
        [Diagram Parse: {error}]
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 p-5 md:p-6 bg-surface/30 border border-surface-border rounded-xl overflow-x-auto flex justify-center 
        [&_*]:filter-none! [&_*]:drop-shadow-none! [&_svg]:overflow-visible
        [&_.cluster-label_span]:text-foreground/75 [&_.cluster-label_span]:font-bold [&_.cluster-label_span]:text-[11px] [&_.cluster-label_span]:tracking-wider [&_.cluster-label_span]:uppercase
        [&_.nodeLabel]:text-foreground [&_.nodeLabel]:font-medium [&_.nodeLabel]:text-[11.5px] [&_.nodeLabel]:leading-snug
        [&_rect]:stroke-[1px]! [&_polygon]:stroke-[1px]! [&_path]:stroke-[1px]!
        [&_.node_rect]:rx-1 [&_.cluster_rect]:rx-2
        [&_.edgeLabel]:text-[10px] [&_.edgeLabel]:text-foreground/60"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
