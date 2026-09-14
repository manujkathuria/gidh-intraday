"use client";

import React from "react";
import { Activity } from "lucide-react";
import { StockSelectorSidebar } from "./components/StockSelectorSidebar";
import { StockHeaderMetrics } from "./components/StockHeaderMetrics";
import { CandlestickCanvas } from "./components/CandlestickCanvas";
import { useChartStudio } from "./hooks/useChartStudio";

export const ChartStudio: React.FC = () => {
  const {
    activeSymbol,
    handleSelectSymbol,
    searchTerm,
    setSearchTerm,
    chartCandles,
    loadingCandles,
    theme,
    selectedDate,
    currentTimeMinutes,
    stockInfo,
    allSymbols,
    filteredSymbols,
  } = useChartStudio();

  const lastClose = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].close : 0;
  const lastVwap = chartCandles.length > 0 ? chartCandles[chartCandles.length - 1].vwap : 0;

  return (
    <div className="flex-1 w-full px-5 py-3 flex gap-4 overflow-hidden">
      {/* 1. Left Stock Selector Sidebar */}
      <StockSelectorSidebar
        allSymbols={allSymbols}
        filteredSymbols={filteredSymbols}
        activeSymbol={activeSymbol}
        selectedDate={selectedDate}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectSymbol={handleSelectSymbol}
      />

      {/* 2. Right Chart Studio Panel */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <StockHeaderMetrics
          activeSymbol={activeSymbol}
          stockInfo={stockInfo}
          currentTimeMinutes={currentTimeMinutes}
          candlesCount={chartCandles.length}
          lastClosePrice={lastClose}
          lastVwap={lastVwap}
        />

        {/* Candlestick Studio Box */}
        <div className="flex-1 bg-surface border border-surface-border rounded-lg p-2 flex flex-col min-h-[580px] relative">
          {loadingCandles && (
            <div className="absolute top-4 right-4 z-20 bg-surface/90 border border-surface-border px-3 py-1.5 rounded text-xs text-foreground/70 flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <Activity className="w-3.5 h-3.5 animate-spin text-foreground" />
              Syncing 1m stream...
            </div>
          )}

          <CandlestickCanvas
            candles={chartCandles}
            symbol={activeSymbol}
            theme={theme}
            height={580}
          />
        </div>
      </div>
    </div>
  );
};
