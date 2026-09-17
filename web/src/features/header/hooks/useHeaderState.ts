import { useState, useEffect } from "react";
import { useMarketStore } from "@/stores/marketStore";
import { useLiveOrderStore } from "@/stores/liveOrderStore";

export function useHeaderState() {
  const {
    sessions,
    selectedDate,
    setSelectedDate,
    snapshot,
  } = useMarketStore();

  const { activePositions, initLiveOrders } = useLiveOrderStore();
  const [isDark, setIsDark] = useState<boolean>(true);

  const activeCount = Object.keys(activePositions).length;

  useEffect(() => {
    initLiveOrders();
  }, [initLiveOrders]);

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

  return {
    sessions,
    selectedDate,
    setSelectedDate,
    snapshot,
    activeCount,
    isDark,
    toggleTheme,
  };
}
