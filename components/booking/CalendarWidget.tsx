"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  endOfMonth,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
  availableDates: Set<string>;
  isLoading?: boolean;
  /** When true, omit outer card chrome for embedding in a parent panel */
  embedded?: boolean;
  showTitle?: boolean;
};

export function CalendarWidget({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  availableDates,
  isLoading,
  embedded,
  showTitle = true,
}: Props) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = startOfDay(new Date());

  const shell = embedded
    ? "p-0"
    : "rounded-3xl border border-[#dfe5ec] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.22)] sm:p-6";

  return (
    <div className={shell}>
      <div className={embedded ? "mb-4 flex flex-wrap items-center justify-between gap-3" : "mb-5 flex items-center justify-between"}>
        {embedded ? (
          <>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              {showTitle ? <h2 className="text-base font-semibold text-[#16212d]">Select Date</h2> : <div />}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-[#dde4eb] bg-white text-[#5b6a79] hover:bg-[#f7fafc]"
                  onClick={() => onMonthChange(addMonths(month, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-[#dde4eb] bg-white text-[#5b6a79] hover:bg-[#f7fafc]"
                  onClick={() => onMonthChange(addMonths(month, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" size="icon" onClick={() => onMonthChange(addMonths(month, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-display text-xl font-semibold tracking-tight">{format(month, "MMMM yyyy")}</div>
            <Button type="button" variant="secondary" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {embedded && <p className="mb-3 text-[31px] font-semibold text-[#1d2834]">{format(month, "MMMM yyyy")}</p>}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-[#6c7a88] sm:text-sm">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-2 font-medium">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const hasSlots = availableDates.has(key);
          const isPast = isBefore(day, today);
          const isSelected = selectedDate === key;
          const disabled = isPast || !hasSlots || isLoading || !inMonth;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(key)}
              className={cn(
                "aspect-square rounded-xl text-sm font-semibold transition-all",
                embedded ? "rounded-full border" : "rounded-xl border",
                isSelected && "border-[#0a51b7] bg-[#0a51b7] text-white shadow-[0_6px_14px_-6px_rgba(10,81,183,0.7)]",
                !isSelected &&
                  hasSlots &&
                  !isPast &&
                  (embedded
                    ? "border-[#dfe5ec] bg-white text-[#16212d] hover:border-[#0a51b7]/45 hover:bg-[#f7fbff]"
                    : "border-primary/15 bg-primary/5 text-primary hover:bg-primary/15"),
                !inMonth && "border-transparent bg-transparent text-[#d2d9e1]",
                inMonth && (!hasSlots || isPast) && "cursor-not-allowed border-transparent text-[#b7c0ca]",
                inMonth && isPast && "opacity-50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
