"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { useReplayStore } from "@/stores/replayStore";
import { ReplayStock } from "@/lib/api";

const SECTOR_COLORS: Record<string, string> = {
  BANKING: "#38bdf8",
  AUTO: "#f472b6",
  IT: "#818cf8",
  PHARMA: "#34d399",
  POWER: "#fbbf24",
  OIL_GAS: "#fb923c",
  METALS: "#94a3b8",
  FMCG: "#c084fc",
  CHEMICALS: "#f87171",
  TELECOM: "#2dd4bf",
  DEFENCE: "#e879f9",
  PSU_RAIL: "#a3e635",
  PSU_FIN: "#60a5fa",
  FIN_SERVICES: "#f59e0b",
  INSURANCE: "#22c55e",
  CAP_GOODS: "#a78bfa",
  OTHERS: "#a1a1aa",
};

export const ScatterRadar: React.FC = () => {
  const { snapshot, selectedSymbol, setSelectedSymbol } = useReplayStore();
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [minRvol, setMinRvol] = useState(0);
  const [vwapFilter, setVwapFilter] = useState<"ALL" | "ABOVE" | "BELOW">("ALL");
  const [hoveredStock, setHoveredStock] = useState<ReplayStock | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 450 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setDimensions({ width, height: Math.max(380, Math.min(500, Math.round(width * 0.45))) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const stocks = snapshot?.stocks || [];

  const sectors = useMemo(() => {
    return ["ALL", ...Array.from(new Set(stocks.map((s) => s.sector)))].sort();
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      if (selectedSector !== "ALL" && s.sector !== selectedSector) return false;
      if ((s.rvol || 0) < minRvol) return false;
      if (vwapFilter === "ABOVE" && !s.is_above_vwap) return false;
      if (vwapFilter === "BELOW" && s.is_above_vwap) return false;
      return true;
    });
  }, [stocks, selectedSector, minRvol, vwapFilter]);

  // Scatter Plot Coordinate Bounds
  const { xMin, xMax, yMin, yMax, maxVol } = useMemo(() => {
    let minX = -3.0;
    let maxX = 3.0;
    let minY = 0.0;
    let maxY = 12.0;
    let maxV = 1;

    for (const s of filteredStocks) {
      const move = s.move_pct || 0;
      const rvol = s.rvol || 0;
      if (move < minX) minX = move;
      if (move > maxX) maxX = move;
      if (rvol > maxY) maxY = rvol;
      if (s.volume > maxV) maxV = s.volume;
    }

    const padX = Math.max(1.0, (maxX - minX) * 0.1);
    const padY = Math.max(1.0, (maxY - minY) * 0.1);

    return {
      xMin: minX - padX,
      xMax: maxX + padX,
      yMin: Math.max(0, minY),
      yMax: maxY + padY,
      maxVol: maxV,
    };
  }, [filteredStocks]);

  // Padding inside the SVG
  const padding = { top: 30, right: 40, bottom: 40, left: 60 };
  const plotWidth = dimensions.width - padding.left - padding.right;
  const plotHeight = dimensions.height - padding.top - padding.bottom;

  const scaleX = (val: number) => {
    return padding.left + ((val - xMin) / (xMax - xMin)) * plotWidth;
  };

  const scaleY = (val: number) => {
    return padding.top + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;
  };

  const scaleRadius = (vol: number) => {
    if (!maxVol || maxVol <= 0) return 6;
    const ratio = Math.sqrt(vol / maxVol);
    return Math.max(5, Math.min(26, 5 + ratio * 21));
  };

  const zeroX = scaleX(0);
  const heavyVolY = scaleY(4.0);
  const godzillaVolY = scaleY(10.0);

  return (
    <div className="flex flex-col gap-4 bg-zinc-900/50 border border-white/10 rounded-xl p-5 backdrop-blur-md">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-6">
          {/* Sector Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Filter Sector
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[140px]"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec} className="bg-zinc-900 text-white">
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Min RVOL Slider */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white/50 uppercase tracking-wider">
                Min RVOL
              </span>
              <span className="font-mono font-bold text-amber-400">
                {minRvol.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={minRvol}
              onChange={(e) => setMinRvol(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* VWAP Position Radio */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              VWAP Position
            </label>
            <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg p-1">
              <button
                onClick={() => setVwapFilter("ALL")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  vwapFilter === "ALL"
                    ? "bg-indigo-600 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVwapFilter("ABOVE")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                  vwapFilter === "ABOVE"
                    ? "bg-emerald-600 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span className="text-emerald-400">▲</span> Above VWAP (Bulls)
              </button>
              <button
                onClick={() => setVwapFilter("BELOW")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                  vwapFilter === "BELOW"
                    ? "bg-rose-600 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span className="text-rose-400">▼</span> Below VWAP (Bears)
              </button>
            </div>
          </div>
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2 self-end">
          <span className="text-xs text-white/40">Visible Assets:</span>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {filteredStocks.length} / {stocks.length}
          </span>
        </div>
      </div>

      {/* Chart Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          RVOL vs Move % Tactical Scatter Radar
          <span className="text-[11px] text-white/40 font-normal font-mono">
            (Bubble Size = Total Volume, Color = Sector Clan)
          </span>
        </h2>
      </div>

      {/* SVG Scatter Plot Canvas */}
      <div ref={containerRef} className="w-full relative select-none">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        >
          {/* Grid Lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={dimensions.height - padding.bottom}
            stroke="rgba(255,255,255,0.1)"
          />
          <line
            x1={padding.left}
            y1={dimensions.height - padding.bottom}
            x2={dimensions.width - padding.right}
            y2={dimensions.height - padding.bottom}
            stroke="rgba(255,255,255,0.1)"
          />

          {/* Zero Move % Center Axis (Dashed) */}
          {zeroX >= padding.left && zeroX <= dimensions.width - padding.right && (
            <g>
              <line
                x1={zeroX}
                y1={padding.top}
                x2={zeroX}
                y2={dimensions.height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="4 4"
              />
              <text
                x={zeroX}
                y={padding.top - 8}
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                0.0% Move
              </text>
            </g>
          )}

          {/* Heavy Volume 4x Threshold Line */}
          {heavyVolY >= padding.top && heavyVolY <= dimensions.height - padding.bottom && (
            <g>
              <line
                x1={padding.left}
                y1={heavyVolY}
                x2={dimensions.width - padding.right}
                y2={heavyVolY}
                stroke="#eab308"
                strokeDasharray="2 3"
                strokeOpacity="0.5"
              />
              <text
                x={dimensions.width - padding.right}
                y={heavyVolY - 4}
                fill="#eab308"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                Heavy Volume (4x)
              </text>
            </g>
          )}

          {/* Godzilla Volume 10x Threshold Line */}
          {godzillaVolY >= padding.top && godzillaVolY <= dimensions.height - padding.bottom && (
            <g>
              <line
                x1={padding.left}
                y1={godzillaVolY}
                x2={dimensions.width - padding.right}
                y2={godzillaVolY}
                stroke="#ef4444"
                strokeDasharray="2 3"
                strokeOpacity="0.7"
              />
              <text
                x={dimensions.width - padding.right}
                y={godzillaVolY - 4}
                fill="#ef4444"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                Godzilla Volume (10x)
              </text>
            </g>
          )}

          {/* X Axis Ticks */}
          {[-4, -2, 0, 2, 4, 6].map((tick) => {
            const x = scaleX(tick);
            if (x < padding.left || x > dimensions.width - padding.right) return null;
            return (
              <g key={`xtick-${tick}`}>
                <line
                  x1={x}
                  y1={dimensions.height - padding.bottom}
                  x2={x}
                  y2={dimensions.height - padding.bottom + 5}
                  stroke="rgba(255,255,255,0.2)"
                />
                <text
                  x={x}
                  y={dimensions.height - padding.bottom + 18}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {tick > 0 ? `+${tick}%` : `${tick}%`}
                </text>
              </g>
            );
          })}

          {/* Y Axis Ticks */}
          {[2, 4, 6, 8, 10, 12, 14].map((tick) => {
            const y = scaleY(tick);
            if (y < padding.top || y > dimensions.height - padding.bottom) return null;
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padding.left - 5}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="rgba(255,255,255,0.2)"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {tick}x
                </text>
              </g>
            );
          })}

          {/* Stock Bubbles */}
          {filteredStocks.map((stock) => {
            const cx = scaleX(stock.move_pct || 0);
            const cy = scaleY(stock.rvol || 0);
            const r = scaleRadius(stock.volume || 0);
            const color = SECTOR_COLORS[stock.sector] || SECTOR_COLORS.OTHERS;
            const isSelected = stock.symbol === selectedSymbol;

            return (
              <g
                key={stock.symbol}
                className="cursor-pointer transition-transform"
                onClick={() => setSelectedSymbol(stock.symbol)}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                  setHoveredStock(stock);
                }}
                onMouseLeave={() => setHoveredStock(null)}
              >
                {/* Bubble Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity={isSelected ? 0.9 : 0.65}
                  stroke={isSelected ? "#ffffff" : color}
                  strokeWidth={isSelected ? 2.5 : 1}
                  className="hover:scale-110 transition duration-150"
                />

                {/* Symbol Label */}
                {(r >= 8 || isSelected || (stock.rvol || 0) >= 3.0) && (
                  <text
                    x={cx}
                    y={cy - r - 3}
                    fill={isSelected ? "#ffffff" : "rgba(255,255,255,0.85)"}
                    fontSize={isSelected ? "11" : "10"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {stock.symbol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredStock && (
          <div
            className="absolute z-50 pointer-events-none bg-zinc-950/95 border border-white/20 rounded-lg p-3 shadow-2xl backdrop-blur-md min-w-[200px]"
            style={{
              left: `${Math.min(dimensions.width - 220, Math.max(10, tooltipPos.x + 15))}px`,
              top: `${Math.min(dimensions.height - 120, Math.max(10, tooltipPos.y - 40))}px`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-2">
              <span className="font-bold text-sm text-white">
                {hoveredStock.symbol}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                {hoveredStock.sector}
              </span>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/50">Move %:</span>
                <span
                  className={
                    (hoveredStock.move_pct || 0) >= 0
                      ? "text-emerald-400 font-bold"
                      : "text-rose-400 font-bold"
                  }
                >
                  {(hoveredStock.move_pct || 0) >= 0 ? "+" : ""}
                  {(hoveredStock.move_pct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">RVOL:</span>
                <span className="text-amber-400 font-bold">
                  {(hoveredStock.rvol || 0).toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">VWAP Δ:</span>
                <span
                  className={
                    hoveredStock.is_above_vwap
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {hoveredStock.is_above_vwap ? "▲" : "▼"}{" "}
                  {Math.abs(hoveredStock.vwap_dist_pct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">CLV:</span>
                <span className="text-white">
                  {(hoveredStock.clv || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Price:</span>
                <span className="text-white font-bold">
                  ₹{Number(hoveredStock.price || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sector Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-[11px] text-white/60">
        <span className="font-semibold text-white/40">Sectors:</span>
        {Object.entries(SECTOR_COLORS)
          .filter(([sec]) => sec !== "OTHERS")
          .map(([sec, color]) => (
            <div key={sec} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/70">{sec}</span>
            </div>
          ))}
      </div>
    </div>
  );
};
