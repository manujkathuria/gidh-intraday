"use client";

import React, { useState, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogBackdrop,
} from "@headlessui/react";
import { Search } from "lucide-react";
import { StockSummaryItem } from "../types";
import { StockComboboxRow } from "./StockComboboxRow";

interface Props {
  allSymbols: StockSummaryItem[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const StockSearchCombobox: React.FC<Props> = ({
  allSymbols,
  activeSymbol,
  onSelectSymbol,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtered =
    query === ""
      ? allSymbols.slice(0, 30)
      : allSymbols.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.sector.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-foreground/80 hover:text-foreground hover:bg-surface-hover transition-colors text-left cursor-pointer group"
      >
        <span className="text-sm font-black tracking-tight uppercase">
          {activeSymbol}
        </span>
        <kbd className="hidden sm:inline-block font-sans px-1.5 py-0.5 text-[9px] rounded text-foreground/40 group-hover:text-foreground/70 bg-surface-muted/50 border border-surface-border">
          ⌘K
        </kbd>
      </button>

      <Dialog
        className="relative z-50"
        open={open}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
          <DialogPanel
            transition
            className="mx-auto max-w-xl transform divide-y divide-surface-border overflow-hidden rounded-xl bg-surface border border-surface-border shadow-2xl transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
          >
            <Combobox
              onChange={(val: any) => {
                if (val) {
                  onSelectSymbol(typeof val === "string" ? val : val.symbol);
                  setOpen(false);
                  setQuery("");
                }
              }}
            >
              <div className="grid grid-cols-1">
                <ComboboxInput
                  autoFocus
                  className="col-start-1 row-start-1 h-11 w-full pr-4 pl-11 text-sm text-foreground bg-transparent outline-hidden placeholder:text-foreground/40"
                  placeholder="Search stock symbol or sector... (e.g. RELIANCE, BANKING)"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Search
                  className="pointer-events-none col-start-1 row-start-1 ml-4 w-4 h-4 self-center text-foreground/40"
                  aria-hidden="true"
                />
              </div>

              {filtered.length > 0 && (
                <ComboboxOptions
                  static
                  className="max-h-80 scroll-py-2 overflow-y-auto p-1.5 text-xs text-foreground divide-y divide-surface-border/30 custom-scrollbar"
                >
                  {filtered.map((stock) => (
                    <StockComboboxRow key={stock.symbol} stock={stock} />
                  ))}
                </ComboboxOptions>
              )}

              {query !== "" && filtered.length === 0 && (
                <p className="p-4 text-xs text-center text-foreground/40">
                  No stocks found for &quot;{query}&quot;
                </p>
              )}
            </Combobox>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};
