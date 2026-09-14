"use client";

import React, { useState, useMemo } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";

interface Props {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  validSessions: string[];
}

export const SessionCalendarPopover: React.FC<Props> = ({
  selectedDate,
  onSelectDate,
  validSessions,
}) => {
  const selectedDateObj = useMemo(() => {
    return selectedDate ? parseISO(selectedDate) : new Date();
  }, [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return selectedDate ? parseISO(selectedDate) : new Date();
  });

  const validDateSet = useMemo(() => new Set(validSessions), [validSessions]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <Popover className="relative select-none text-xs">
      <PopoverButton className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-foreground/75 hover:text-foreground hover:bg-surface-hover cursor-pointer transition focus:outline-none">
        <CalendarIcon className="w-3.5 h-3.5 text-foreground/50" />
        <span className="font-bold text-[11px] tabular-nums tracking-wide">
          {selectedDate || "Select Session"}
        </span>
      </PopoverButton>


      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1 w-64 rounded-xl bg-surface border border-surface-border p-3 shadow-2xl transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 focus:outline-none"
      >
        {({ close }) => (
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border">
              <span className="font-bold text-xs text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-surface-hover text-foreground/60 hover:text-foreground cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-surface-hover text-foreground/60 hover:text-foreground cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-foreground/40 mb-1">
              <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const isCurrentMonthDay = isSameMonth(day, currentMonth);
                const isValid = validDateSet.has(dateKey);
                const isSelected = isSameDay(day, selectedDateObj);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!isValid}
                    onClick={() => {
                      if (isValid) {
                        onSelectDate(dateKey);
                        close();
                      }
                    }}
                    className={`h-7 w-7 mx-auto flex items-center justify-center rounded-md text-[11px] tabular-nums transition ${
                      isSelected
                        ? "bg-foreground text-background font-black shadow-xs"
                        : isValid
                        ? "text-foreground font-bold hover:bg-surface-hover cursor-pointer"
                        : "text-foreground/20 cursor-not-allowed"
                    } ${!isCurrentMonthDay && !isSelected ? "opacity-30" : ""}`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-surface-border flex items-center justify-between text-[10px] text-foreground/40">
              <span>{validSessions.length} sessions</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                <span>Replay Day</span>
              </span>
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
};

