import { create } from "zustand";

export interface ChartIndicatorState {
  showPoc: boolean;
  showBands: boolean;
  showVwap: boolean;
  showMacroLevels: boolean;
  showPwhPwl: boolean;
  showPdhPdl: boolean;
  showSwingPivots: boolean;
  showClvZones: boolean;
  // Daily Macro Specific Plugins (52-week / 120-day historical lookback)
  dailyLookback: number;
  showDailyPwh: boolean;
  showDailyPwl: boolean;
  showDailySwings: boolean;
  showDailyClv: boolean;
  togglePoc: () => void;
  toggleBands: () => void;
  toggleVwap: () => void;
  toggleMacroLevels: () => void;
  togglePwhPwl: () => void;
  togglePdhPdl: () => void;
  toggleSwingPivots: () => void;
  toggleClvZones: () => void;
  toggleDailyPwh: () => void;
  toggleDailyPwl: () => void;
  toggleDailySwings: () => void;
  toggleDailyClv: () => void;
  setDailyLookback: (days: number) => void;
  setPoc: (show: boolean) => void;
  setBands: (show: boolean) => void;
  setVwap: (show: boolean) => void;
  setMacroLevels: (show: boolean) => void;
  setPwhPwl: (show: boolean) => void;
  setPdhPdl: (show: boolean) => void;
  setSwingPivots: (show: boolean) => void;
  setClvZones: (show: boolean) => void;
  setDailyPwh: (show: boolean) => void;
  setDailyPwl: (show: boolean) => void;
  setDailySwings: (show: boolean) => void;
  setDailyClv: (show: boolean) => void;
}

export const useChartIndicatorStore = create<ChartIndicatorState>((set) => ({
  showPoc: false,
  showBands: true,
  showVwap: true,
  showMacroLevels: true,
  showPwhPwl: true,
  showPdhPdl: true,
  showSwingPivots: true,
  showClvZones: true,
  dailyLookback: 120,
  showDailyPwh: true,
  showDailyPwl: true,
  showDailySwings: true,
  showDailyClv: true,
  togglePoc: () => set((state) => ({ showPoc: !state.showPoc })),
  toggleBands: () => set((state) => ({ showBands: !state.showBands })),
  toggleVwap: () => set((state) => ({ showVwap: !state.showVwap })),
  toggleMacroLevels: () => set((state) => ({ showMacroLevels: !state.showMacroLevels })),
  togglePwhPwl: () => set((state) => ({ showPwhPwl: !state.showPwhPwl })),
  togglePdhPdl: () => set((state) => ({ showPdhPdl: !state.showPdhPdl })),
  toggleSwingPivots: () => set((state) => ({ showSwingPivots: !state.showSwingPivots })),
  toggleClvZones: () => set((state) => ({ showClvZones: !state.showClvZones })),
  toggleDailyPwh: () => set((state) => ({ showDailyPwh: !state.showDailyPwh })),
  toggleDailyPwl: () => set((state) => ({ showDailyPwl: !state.showDailyPwl })),
  toggleDailySwings: () => set((state) => ({ showDailySwings: !state.showDailySwings })),
  toggleDailyClv: () => set((state) => ({ showDailyClv: !state.showDailyClv })),
  setDailyLookback: (days) => set({ dailyLookback: days }),
  setPoc: (show) => set({ showPoc: show }),
  setBands: (show) => set({ showBands: show }),
  setVwap: (show) => set({ showVwap: show }),
  setMacroLevels: (show) => set({ showMacroLevels: show }),
  setPwhPwl: (show) => set({ showPwhPwl: show }),
  setPdhPdl: (show) => set({ showPdhPdl: show }),
  setSwingPivots: (show) => set({ showSwingPivots: show }),
  setClvZones: (show) => set({ showClvZones: show }),
  setDailyPwh: (show) => set({ showDailyPwh: show }),
  setDailyPwl: (show) => set({ showDailyPwl: show }),
  setDailySwings: (show) => set({ showDailySwings: show }),
  setDailyClv: (show) => set({ showDailyClv: show }),
}));
