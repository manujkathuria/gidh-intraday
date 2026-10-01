import React from "react";
import { MacroDashboard } from "@/features/macro";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macro Selection | Gidh Intraday",
  description: "RVOL + PDH/PDL Macro Stock Selection and Sigma Hunter",
};

export default function MacroPage() {
  return <MacroDashboard />;
}
