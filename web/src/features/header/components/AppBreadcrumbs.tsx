import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, PanelLeft } from "lucide-react";
import { useMarketStore } from "@/stores/marketStore";
import { StockSearchCombobox } from "@/features/chart/components/StockSearchCombobox";
import { StockSummaryItem } from "@/features/chart/types";
import { ThemeToggle } from "./ThemeToggle";
import { SessionCalendarPopover } from "./SessionCalendarPopover";
import { UserAuthButton } from "./UserAuthButton";

interface Props {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  breadth?: number;
  isDark: boolean;
  toggleTheme: () => void;
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
  sessions?: string[];
}

export const AppBreadcrumbs: React.FC<Props> = ({
  isCollapsed,
  onToggleSidebar,
  breadth = 0,
  isDark,
  toggleTheme,
  selectedDate,
  setSelectedDate,
  sessions = [],
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbolParam = searchParams.get("symbol");
  const { snapshot, selectedSymbol, setSelectedSymbol } = useMarketStore();

  const allSymbols: StockSummaryItem[] = useMemo(() => {
    if (!snapshot?.stocks) return [];
    return snapshot.stocks.map((s) => ({
      symbol: s.symbol,
      sector: s.sector,
      move_pct: s.move_pct,
      price: s.price,
      rvol: s.rvol,
      clv: s.clv,
    }));
  }, [snapshot]);

  const activeSymbol = symbolParam || selectedSymbol || "RELIANCE";

  const routeNames: Record<string, string> = {
    "/": "Radar",
    "/macro": "Macro",
    "/sectors": "Sectors",
    "/chart": "Charts",
    "/brain": "Brain",
    "/positions": "Positions",
  };

  const currentRouteName = routeNames[pathname] || "Radar";
  const activeSector = snapshot?.stocks?.find((s) => s.symbol === activeSymbol)?.sector;
  const isBullish = breadth >= 50;

  return (
    <div className="flex items-center justify-between select-none shrink-0 text-xs py-0 w-full">
      {/* Left: Mobile Menu Button + Breadcrumbs with Stock Search Combobox & Sector */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1 -ml-1 rounded text-foreground/70 hover:text-foreground hover:bg-surface-hover transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <Link
          href={pathname}
          className="font-bold text-foreground text-xs hover:opacity-80 transition tracking-wide leading-none shrink-0"
        >
          {currentRouteName}
        </Link>

        {pathname === "/chart" ? (
          <div className="flex items-center gap-1.5 text-foreground/40 leading-none">
            <ChevronRight className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
            <StockSearchCombobox
              allSymbols={allSymbols}
              activeSymbol={activeSymbol}
              onSelectSymbol={(sym) => {
                setSelectedSymbol(sym);
                router.replace(`/chart?symbol=${encodeURIComponent(sym)}`);
              }}
              className="flex items-center gap-1.5 px-2 py-1 -my-1 rounded-md text-foreground font-black text-xs hover:bg-surface-hover border border-surface-border/60 hover:border-surface-border transition-colors cursor-pointer group shadow-2xs"
            />
            {activeSector && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-foreground/60 font-semibold border border-surface-border uppercase tracking-wide">
                {activeSector}
              </span>
            )}
          </div>
        ) : symbolParam ? (
          <div className="flex items-center gap-1.5 text-foreground/40 leading-none">
            <ChevronRight className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
            <span className="font-bold text-foreground text-xs">
              {symbolParam}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right: VWAP Breadth + Session Calendar + Theme Toggle + Auth */}
      <div className="flex items-center gap-1.5 text-foreground/80">
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-[11px] font-medium"
          title={`Market Breadth (Universe > VWAP): ${breadth.toFixed(0)}% (${isBullish ? "BULLISH" : "BEARISH"})`}
        >
          <span className="text-[10px] text-foreground/50 uppercase tracking-tight">VWAP</span>
          <span className={`font-bold tabular-nums ${isBullish ? "text-emerald-500" : "text-rose-500"}`}>
            {breadth.toFixed(0)}%
          </span>
        </div>

        {setSelectedDate && (
          <SessionCalendarPopover
            selectedDate={selectedDate || ""}
            onSelectDate={setSelectedDate}
            validSessions={sessions}
          />
        )}

        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />

        <div className="h-2.5 w-px bg-surface-border mx-0.5" />

        <UserAuthButton />
      </div>
    </div>
  );
};
