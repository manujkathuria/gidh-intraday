import React from "react";
import { DocShell } from "@/features/docs";

export const metadata = {
  title: "Gidh Documentation | Architecture & Quantitative Specs",
  description: "Comprehensive Quantitative AI Brain Architecture and Backend Streaming Specs",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocShell>{children}</DocShell>;
}
