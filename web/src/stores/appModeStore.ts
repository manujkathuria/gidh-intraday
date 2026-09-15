import { create } from "zustand";

export type AppMode = "LIVE" | "REPLAY";

interface AppModeState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppModeStore = create<AppModeState>((set) => ({
  mode: "LIVE",
  setMode: (mode: AppMode) => set({ mode }),
}));
