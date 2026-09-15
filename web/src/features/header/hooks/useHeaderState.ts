import { useState, useEffect, useRef } from "react";
import { useAppModeStore } from "@/stores/appModeStore";
import { useMarketData } from "@/stores/useMarketData";
import { useReplayStore } from "@/stores/replayStore";
import { useLiveStore } from "@/stores/liveStore";
import { useLiveOrderStore } from "@/stores/liveOrderStore";

export function useHeaderState() {
  const { mode, setMode: setAppMode } = useAppModeStore();
  const { snapshot, currentTimeMinutes } = useMarketData();
  const liveStore = useLiveStore();
  const replayStore = useReplayStore();

  const {
    sessions,
    selectedDate,
    setSelectedDate,
    setCurrentTimeMinutes,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
  } = replayStore;

  const setMode = (newMode: "LIVE" | "REPLAY") => {
    setAppMode(newMode);
    if (newMode === "LIVE") {
      liveStore.initLive();
    } else {
      liveStore.stopLiveSync();
      replayStore.init();
    }
  };

  const { activePositions, initLiveOrders } = useLiveOrderStore();

  const [localTime, setLocalTime] = useState<number>(currentTimeMinutes);
  const isDraggingRef = useRef<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [liveClock, setLiveClock] = useState<string>("");

  const activeCount = Object.keys(activePositions).length;

  useEffect(() => {
    initLiveOrders();
  }, [initLiveOrders]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gidh-theme");
    const prefersDark = savedTheme ? savedTheme === "dark" : true;
    setIsDark(prefersDark);
    const root = document.documentElement;
    if (prefersDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const root = document.documentElement;
    if (nextDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("gidh-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("gidh-theme", "light");
    }
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTime(currentTimeMinutes);
    }
  }, [currentTimeMinutes]);

  const handleSliderChange = (val: number) => {
    isDraggingRef.current = true;
    setLocalTime(val);
  };

  const handleSliderCommit = () => {
    isDraggingRef.current = false;
    setCurrentTimeMinutes(localTime);
  };

  return {
    mode,
    setMode,
    sessions,
    selectedDate,
    setSelectedDate,
    currentTimeMinutes,
    setCurrentTimeMinutes,
    localTime,
    setLocalTime,
    handleSliderChange,
    handleSliderCommit,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    snapshot,
    activeCount,
    isDark,
    toggleTheme,
    liveClock,
  };
}
