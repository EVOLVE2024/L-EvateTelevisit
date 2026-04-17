"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingsList } from "@/components/admin/BookingsList";
import { WeekCalendar } from "@/components/admin/WeekCalendar";

type View = "list" | "calendar";

export function BookingsTab() {
  const [view, setView] = useState<View>("list");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 text-muted-foreground">
            Every televisit at a glance — review the list or see the week at a glance.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--card))] p-0.5 shadow-ambient">
          <ViewBtn icon={<List className="h-4 w-4" />} label="List" active={view === "list"} onClick={() => setView("list")} />
          <ViewBtn
            icon={<CalendarDays className="h-4 w-4" />}
            label="Calendar"
            active={view === "calendar"}
            onClick={() => setView("calendar")}
          />
        </div>
      </div>

      {view === "list" ? <BookingsList /> : <WeekCalendar />}
    </div>
  );
}

function ViewBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
