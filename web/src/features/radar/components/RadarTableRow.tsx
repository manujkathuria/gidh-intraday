"use client";

import React from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { ReplayStock } from "@/lib/api";

interface Props {
  stock: ReplayStock;
  index: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

function formatVolume(vol: number): string {
  if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
  if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
  return vol.toString();
}

export const RadarTableRow: React.FC<Props> = ({
  stock,
  index,
  isSelected,
  onSelect,
}) => {
  const price = stock.price || 0;
  const move = stock.move_pct || 0;
  const vwapDist = stock.vwap_dist_pct || 0;
  const rvol = stock.rvol || 0;
  const clv = stock.clv || 0;
  const vol = stock.volume || 0;
  const isAbove = stock.is_above_vwap;
  const pace = rvol * 100;
  const rvolBarPct = Math.min(100, Math.max(0, (rvol / 10.0) * 100));

  return (
    <tr
      onClick={() => onSelect(stock.symbol)}
      className={`border-b border-surface-border transition-colors cursor-pointer group font-mono text-xs ${
        isSelected
          ? "bg-surface-hover font-semibold"
          : "hover:bg-surface-hover/60"
      }`}
    >
      {/* Rank # */}
      <td className="py-2.5 px-3 text-center text-foreground/30 text-[11px]">
        {index + 1}
      </td>

      {/* Symbol */}
      <td className="py-2.5 px-3 font-bold text-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAbove ? "bg-foreground" : "bg-surface-border"
            }`}
          />
          <span className="text-xs tracking-wide">{stock.symbol}</span>
          {pace >= 10.0 && (
            <span className="px-1 py-0.2 rounded bg-foreground text-background text-[9px] font-bold">
              SURGE
            </span>
          )}
        </div>

        <Link
          href={`/chart?symbol=${encodeURIComponent(stock.symbol)}`}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-foreground hover:text-background text-foreground/40 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
          title={`Open ${stock.symbol} Candlestick Chart`}
        >
          <LineChart className="w-3.5 h-3.5" />
        </Link>
      </td>

      {/* Sector */}
      <td className="py-2.5 px-3 text-foreground/50 text-[11px]">{stock.sector}</td>

      {/* Price */}
      <td className="py-2.5 px-3 text-right text-foreground">₹{price.toFixed(2)}</td>

      {/* Move % */}
      <td className="py-2.5 px-3 text-right font-bold text-foreground">
        {move >= 0 ? "+" : ""}
        {move.toFixed(2)}%
      </td>

      {/* Volume Pace Progress Bar */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className="w-16 bg-surface-border h-1 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-foreground rounded-full"
              style={{ width: `${rvolBarPct}%` }}
            />
          </div>
          <span className="font-bold text-xs text-foreground">
            {pace.toFixed(1)}%
          </span>
        </div>
      </td>

      {/* VWAP Distance */}
      <td className="py-2.5 px-3 text-right font-medium text-foreground/80">
        {isAbove ? "▲" : "▼"} {Math.abs(vwapDist).toFixed(2)}%
      </td>

      {/* CLV */}
      <td className="py-2.5 px-3 text-right text-foreground/70">{clv.toFixed(2)}</td>

      {/* Volume */}
      <td className="py-2.5 px-3 text-right text-foreground/40">{formatVolume(vol)}</td>
    </tr>
  );
};
