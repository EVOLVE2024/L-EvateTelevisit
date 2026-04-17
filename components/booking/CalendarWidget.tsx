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
import { Skeleton } from "@/components/ui/skeleton";
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
  const prevMonth = addMonths(month, -1);
  const prevMonthDisabled = isBefore(endOfMonth(prevMonth), today);

  const shell = embedded
    ? "p-0"
    : "rounded-3xl border border-[#dfe5ec] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.22)] sm:p-6";

  return (
    <div className={shell}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {showTitle && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a96a5]">
              Select a date
            </p>
          )}
          <p className={cn("font-display text-[22px] font-semibold tracking-tight text-[#111a26] sm:text-[26px]", showTitle && "mt-0.5")}>
            {format(month, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={prevMonthDisabled}
            className="h-9 w-9 rounded-lg border border-[#e2e8ee] bg-white text-[#5b6a79] shadow-sm transition-colors hover:border-[#cdd7e1] hover:bg-[#f5f8fb] hover:text-[#1a2432] disabled:cursor-not-allowed disabled:border-[#edf0f4] disabled:bg-[#f6f8fb] disabled:text-[#c2cad4] disabled:shadow-none disabled:hover:border-[#edf0f4] disabled:hover:bg-[#f6f8fb] disabled:hover:text-[#c2cad4]"
            onClick={() => !prevMonthDisabled && onMonthChange(prevMonth)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            className="h-9 w-9 rounded-lg border border-[#e2e8ee] bg-white text-[#5b6a79] shadow-sm transition-colors hover:border-[#cdd7e1] hover:bg-[#f5f8fb] hover:text-[#1a2432]"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99a5b3]"
          >
            {d.slice(0, 3)}
          </div>
        ))}
        {isLoading
          ? days.map((day) => (
              <Skeleton
                key={`sk-${format(day, "yyyy-MM-dd")}`}
                className="aspect-square w-full rounded-lg"
              />
            ))
          : days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const hasSlots = availableDates.has(key);
          const isPast = isBefore(day, today);
          const isSelected = selectedDate === key;
          const disabled = isPast || !hasSlots || !inMonth;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(key)}
              aria-pressed={isSelected}
              aria-label={`${format(day, "EEEE, MMMM d")}${hasSlots ? " (available)" : ""}`}
              className={cn(
                "group relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a51b7]/40 focus-visible:ring-offset-2",
                isSelected &&
                  "bg-[#0a51b7] text-white shadow-[0_8px_18px_-10px_rgba(10,81,183,0.65)] ring-1 ring-[#0a51b7]",
                !isSelected &&
                  inMonth &&
                  hasSlots &&
                  !isPast &&
                  "border border-[#e3e9f0] bg-white text-[#1a2432] hover:-translate-y-0.5 hover:border-[#0a51b7]/40 hover:bg-[#f6faff] hover:text-[#0a51b7]",
                !inMonth && "bg-transparent text-[#cad2db]",
                inMonth && (!hasSlots || isPast) && !isSelected &&
                  "cursor-not-allowed bg-transparent text-[#b7c0ca]",
                inMonth && isPast && !isSelected && "opacity-60"
              )}
            >
              <span className="leading-none">{format(day, "d")}</span>
              {hasSlots && !isPast && inMonth && (
                <span
                  className={cn(
                    "mt-1 h-1 w-1 rounded-full transition-colors",
                    isSelected ? "bg-white/80" : "bg-[#0a51b7]/70 group-hover:bg-[#0a51b7]"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#6f7e8e]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-[#e3e9f0] bg-white" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0a51b7]" />
          Selected
        </span>
      </div>
    </div>
  );
}
