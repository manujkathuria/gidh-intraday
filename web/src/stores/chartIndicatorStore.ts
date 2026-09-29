import { create } from "zustand";

export interface ChartIndicatorState {
  showPoc: boolean;
  showBands: boolean;
  showVwap: boolean;
  togglePoc: () => void;
  toggleBands: () => void;
  toggleVwap: () => void;
  setPoc: (show: boolean) => void;
  setBands: (show: boolean) => void;
  setVwap: (show: boolean) => void;
}

export const useChartIndicatorStore = create<ChartIndicatorState>((set) => ({
  showPoc: false,
  showBands: true,
  showVwap: true,
  togglePoc: () => set((state) => ({ showPoc: !state.showPoc })),
  toggleBands: () => set((state) => ({ showBands: !state.showBands })),
  toggleVwap: () => set((state) => ({ showVwap: !state.showVwap })),
  setPoc: (show) => set({ showPoc: show }),
  setBands: (show) => set({ showBands: show }),
  setVwap: (show) => set({ showVwap: show }),
}));
