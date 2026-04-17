"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CalendarBooking = {
  id: string;
  patient_id: string | null;
  status: string;
  title: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  cal_booking_id: string;
  patient: {
    id: string | null;
    name: string | null;
    email: string | null;
    cell: string | null;
  };
};

type ApiResponse = {
  rangeStart: string;
  rangeEnd: string;
  bookings: CalendarBooking[];
};

function statusDotColor(s: string) {
  if (s === "confirmed") return "bg-emerald-500";
  if (s === "pending") return "bg-amber-500";
  if (s === "cancelled") return "bg-rose-500";
  return "bg-slate-400";
}

function statusChipClasses(s: string) {
  if (s === "confirmed") return "bg-emerald-50 text-emerald-900 border-emerald-200";
  if (s === "pending") return "bg-amber-50 text-amber-900 border-amber-200";
  if (s === "cancelled") return "bg-rose-50 text-rose-900 border-rose-200";
  return "bg-slate-50 text-slate-900 border-slate-200";
}

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  return "secondary" as const;
}

export function BookingCalendar() {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const res = await fetch(
        `/api/admin/bookings/calendar?month=${format(month, "yyyy-MM")}`,
        { cache: "no-store" }
      );
      if (!active) return;
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [month]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    (data?.bookings ?? []).forEach((b) => {
      const key = format(parseISO(b.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    map.forEach((list) => {
      list.sort(
        (a: CalendarBooking, b: CalendarBooking) =>
          parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
      );
    });
    return map;
  }, [data]);

  const monthCountsByStatus = useMemo(() => {
    const counts = { confirmed: 0, pending: 0, cancelled: 0, other: 0, total: 0 };
    (data?.bookings ?? []).forEach((b) => {
      const d = parseISO(b.start_time);
      if (!isSameMonth(d, month)) return;
      counts.total += 1;
      if (b.status === "confirmed") counts.confirmed += 1;
      else if (b.status === "pending") counts.pending += 1;
      else if (b.status === "cancelled") counts.cancelled += 1;
      else counts.other += 1;
    });
    return counts;
  }, [data, month]);

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Viewing
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {format(month, "MMMM yyyy")}
            </h2>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-1"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <LegendPill color="bg-emerald-500" label={`Confirmed · ${monthCountsByStatus.confirmed}`} />
          <LegendPill color="bg-amber-500" label={`Pending · ${monthCountsByStatus.pending}`} />
          <LegendPill color="bg-rose-500" label={`Cancelled · ${monthCountsByStatus.cancelled}`} />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {monthCountsByStatus.total} in month
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[620px] w-full rounded-2xl" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))]">
          <div className="grid grid-cols-7 border-b border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(128px,1fr)]">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const list = byDay.get(key) ?? [];
              const outside = !isSameMonth(day, month);
              const isToday = isSameDay(day, today);
              const shown = list.slice(0, 3);
              const extra = list.length - shown.length;

              return (
                <div
                  key={key}
                  className={cn(
                    "relative flex flex-col gap-1 border-b border-r border-[hsl(var(--border))]/10 p-2 transition-colors",
                    outside ? "bg-[hsl(var(--surface-low))]/20" : "bg-[hsl(var(--card))]",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                        outside ? "text-muted-foreground/50" : "text-foreground",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {list.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                        {list.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {shown.map((b) => (
                      <BookingChip key={b.id} booking={b} />
                    ))}
                    {extra > 0 && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">
                        + {extra} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/60 px-2.5 py-1 font-medium text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function BookingChip({ booking }: { booking: CalendarBooking }) {
  const time = format(parseISO(booking.start_time), "p");
  const name = booking.patient.name ?? booking.attendee_name ?? "Unnamed";

  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          "w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition-colors",
          statusChipClasses(booking.status)
        )}
        title={`${time} · ${name}`}
      >
        <span className="mr-1 inline-block align-middle">
          <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle", statusDotColor(booking.status))} />
        </span>
        <span className="align-middle">{time}</span>
        <span className="ml-1 align-middle text-[10px] font-normal opacity-80">· {name}</span>
      </button>

      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 scale-95 rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-3 opacity-0 shadow-ambient transition-all",
          "group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{name}</p>
          <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {format(parseISO(booking.start_time), "PPp")} — {format(parseISO(booking.end_time), "p")}
          </p>
          {booking.patient.email && (
            <p className="inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              {booking.patient.email}
            </p>
          )}
          {booking.patient.cell && (
            <p className="inline-flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {booking.patient.cell}
            </p>
          )}
          {booking.title && (
            <p className="italic text-foreground/80">{booking.title}</p>
          )}
          <p className="font-mono text-[10px] opacity-70">{booking.cal_booking_id}</p>
        </div>
      </div>
    </div>
  );
}
