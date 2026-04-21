"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BookingDetailDrawer } from "@/components/admin/BookingDetailDrawer";
import { PatientDetailDrawer } from "@/components/admin/PatientDetailDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CLINIC_TIMEZONE_ABBR,
  addDaysToKey,
  clinicDateKey,
  clinicGmtOffset,
  clinicHour,
  clinicMinute,
  clinicWeekStartKey,
  parseKeyAsLocalDate,
} from "@/lib/time";

type Booking = {
  id: string;
  uid: string | null;
  title: string | null;
  status: string;
  start: string;
  end: string;
  duration: number | null;
  meeting_url: string | null;
  location: string | null;
  created_at: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_tz: string | null;
  host_name: string | null;
  supabase_patient_id: string | null;
  patient_supabase_found: boolean;
};

type StatusFilter = "all" | "pending" | "confirmed" | "rescheduled";

const HOUR_ROW_HEIGHT = 56;
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const DEFAULT_SCROLL_HOUR = 7;
const WEEK_STARTS_ON: 0 = 0;
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function statusTheme(status: string): {
  accent: string;
  chip: string;
  chipHover: string;
  text: string;
  label: string;
} {
  switch (status) {
    case "confirmed":
      return {
        accent: "bg-emerald-500",
        chip: "bg-emerald-50 border-emerald-200/80",
        chipHover: "hover:bg-emerald-100",
        text: "text-emerald-950",
        label: "Confirmed",
      };
    case "rescheduled":
      return {
        accent: "bg-sky-500",
        chip: "bg-sky-50 border-sky-200/80",
        chipHover: "hover:bg-sky-100",
        text: "text-sky-950",
        label: "Rescheduled",
      };
    case "pending":
    default:
      return {
        accent: "bg-amber-500",
        chip: "bg-amber-50 border-amber-200/80",
        chipHover: "hover:bg-amber-100",
        text: "text-amber-950",
        label: "Pending",
      };
  }
}

function formatHourLabel(h: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:00${suffix}`;
}

function minutesFromDayStart(iso: string): number {
  return clinicHour(iso) * 60 + clinicMinute(iso);
}

/** Week range as UTC ISO, padded ±1 day so DST edges aren't lost. */
function weekApiWindow(weekStartKey: string) {
  const start = addDaysToKey(weekStartKey, -1);
  const end = addDaysToKey(weekStartKey, 7);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const s = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0)).toISOString();
  const e = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59)).toISOString();
  return { s, e };
}

export function WeekCalendar() {
  const [anchorKey, setAnchorKey] = useState<string>(() => clinicWeekStartKey(new Date(), WEEK_STARTS_ON));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshTick, setRefreshTick] = useState(0);

  const dayKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysToKey(anchorKey, i)),
    [anchorKey]
  );
  // Recomputed each render so "today" stays correct past midnight.
  const todayKey = clinicDateKey(new Date());
  const offset = useMemo(() => clinicGmtOffset(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const { s, e } = weekApiWindow(anchorKey);
    const params = new URLSearchParams({ start: s, end: e });
    void (async () => {
      try {
        const res = await fetch(`/api/admin/bookings/week?${params.toString()}`, {
          cache: "no-store",
        });
        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as { bookings: Booking[] };
          setBookings(data.bookings ?? []);
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Could not load bookings.");
          setBookings([]);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Network error");
        setBookings([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [anchorKey, refreshTick]);

  // Cancelled bookings are hidden from the calendar.
  const visible = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled"),
    [bookings]
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return visible;
    return visible.filter((b) => b.status === statusFilter);
  }, [visible, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of filtered) {
      if (!b.start) continue;
      const key = clinicDateKey(b.start);
      if (!dayKeys.includes(key)) continue;
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    map.forEach((arr) =>
      arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );
    return map;
  }, [filtered, dayKeys]);

  const counts = useMemo(() => {
    const c = { all: visible.length, pending: 0, confirmed: 0, rescheduled: 0 };
    for (const b of visible) {
      if (b.status === "pending") c.pending += 1;
      else if (b.status === "confirmed") c.confirmed += 1;
      else if (b.status === "rescheduled") c.rescheduled += 1;
    }
    return c;
  }, [visible]);

  const rangeLabel = useMemo(() => {
    const sd = parseKeyAsLocalDate(dayKeys[0]);
    const ed = parseKeyAsLocalDate(dayKeys[6]);
    const sameMonth = sd.getMonth() === ed.getMonth();
    const sm = sd.toLocaleString("en-US", { month: "short" });
    const em = ed.toLocaleString("en-US", { month: "short" });
    const yr = ed.getFullYear();
    return sameMonth
      ? `${sm} ${sd.getDate()} – ${ed.getDate()}, ${yr}`
      : `${sm} ${sd.getDate()} – ${em} ${ed.getDate()}, ${yr}`;
  }, [dayKeys]);

  return (
    <div className="space-y-4">
      <Toolbar
        rangeLabel={rangeLabel}
        offset={offset}
        onPrev={() => setAnchorKey((k) => addDaysToKey(k, -7))}
        onNext={() => setAnchorKey((k) => addDaysToKey(k, 7))}
        onToday={() => setAnchorKey(clinicWeekStartKey(new Date(), WEEK_STARTS_ON))}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        counts={counts}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] shadow-ambient">
        {loading ? (
          <div className="p-5">
            <Skeleton className="h-[560px] w-full rounded-xl" />
          </div>
        ) : (
          <TimeGrid
            dayKeys={dayKeys}
            todayKey={todayKey}
            byDay={byDay}
            offset={offset}
            onSelect={setSelectedUid}
          />
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/30 p-6 text-center text-sm text-muted-foreground">
          No bookings in this week.
        </div>
      )}

      <BookingDetailDrawer
        uid={selectedUid}
        onClose={() => setSelectedUid(null)}
        onChanged={() => setRefreshTick((n) => n + 1)}
        onViewPatient={(pid) => {
          setSelectedUid(null);
          setSelectedPatientId(pid);
        }}
      />
      <PatientDetailDrawer
        patientId={selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  );
}

function Toolbar({
  rangeLabel,
  offset,
  onPrev,
  onNext,
  onToday,
  statusFilter,
  setStatusFilter,
  counts,
}: {
  rangeLabel: string;
  offset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  counts: { all: number; pending: number; confirmed: number; rescheduled: number };
}) {
  const filters: Array<{ id: StatusFilter; label: string; count: number; dot: string }> = [
    { id: "all", label: "All", count: counts.all, dot: "bg-slate-400" },
    { id: "pending", label: "Pending", count: counts.pending, dot: "bg-amber-500" },
    { id: "confirmed", label: "Confirmed", count: counts.confirmed, dot: "bg-emerald-500" },
    { id: "rescheduled", label: "Rescheduled", count: counts.rescheduled, dot: "bg-sky-500" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-3 shadow-ambient">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 px-3 text-sm font-medium text-foreground">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {rangeLabel}
        </div>
        <span className="rounded-md bg-[hsl(var(--surface-low))]/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {CLINIC_TIMEZONE_ABBR} · GMT {offset >= 0 ? "+" : ""}
          {offset}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 p-0.5">
          {filters.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />
                {f.label}
                <span
                  className={cn(
                    "ml-0.5 rounded px-1 font-mono text-[10px]",
                    active ? "bg-[hsl(var(--surface-low))]/80 text-foreground" : "text-muted-foreground"
                  )}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={onToday}>
            Today
          </Button>
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-high))] hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-high))] hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeGrid({
  dayKeys,
  todayKey,
  byDay,
  offset,
  onSelect,
}: {
  dayKeys: string[];
  todayKey: string;
  byDay: Map<string, Booking[]>;
  offset: number;
  onSelect: (uid: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);
  const totalHeight = hours.length * HOUR_ROW_HEIGHT;

  // Land on ~7am so the view doesn't open at midnight.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = (DEFAULT_SCROLL_HOUR - DAY_START_HOUR) * HOUR_ROW_HEIGHT;
  }, []);

  return (
    <div>
      <div
        className="grid sticky top-0 z-20 border-b border-[hsl(var(--border))]/10 bg-[hsl(var(--card))]"
        style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
      >
        <div className="flex items-end justify-end px-2 py-3 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          GMT {offset >= 0 ? "+" : ""}
          {offset}
        </div>
        {dayKeys.map((key, i) => {
          const d = parseKeyAsLocalDate(key);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-center gap-1.5 border-l border-[hsl(var(--border))]/10 px-3 py-3",
                isToday && "bg-primary/[0.04]"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {DAY_NAMES[i]}
              </span>
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: "64px repeat(7, 1fr)", height: totalHeight }}
        >
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="relative border-t border-[hsl(var(--border))]/10"
                style={{ height: HOUR_ROW_HEIGHT }}
              >
                <span className="absolute -top-2 right-2 font-mono text-[10px] font-medium text-muted-foreground">
                  {h === DAY_START_HOUR ? "" : formatHourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {dayKeys.map((key) => {
            const items = byDay.get(key) ?? [];
            const laneGroups = layoutDayEvents(items);
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  "relative border-l border-[hsl(var(--border))]/10",
                  isToday && "bg-primary/[0.025]"
                )}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-t border-[hsl(var(--border))]/10"
                    style={{ height: HOUR_ROW_HEIGHT }}
                  />
                ))}

                {isToday && <NowIndicator />}

                {laneGroups.map(({ booking, laneIndex, laneCount }) => {
                  const startMin = minutesFromDayStart(booking.start);
                  const endMin = Math.max(startMin + 15, minutesFromDayStart(booking.end));
                  const top = (startMin / 60) * HOUR_ROW_HEIGHT;
                  const height = ((endMin - startMin) / 60) * HOUR_ROW_HEIGHT;
                  const widthPct = 100 / laneCount;
                  const leftPct = widthPct * laneIndex;
                  return (
                    <EventChip
                      key={booking.id + booking.start}
                      booking={booking}
                      top={top}
                      height={height}
                      leftPct={leftPct}
                      widthPct={widthPct}
                      onClick={() => booking.uid && onSelect(booking.uid)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NowIndicator() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const top = ((clinicHour(now) * 60 + clinicMinute(now)) / 60) * HOUR_ROW_HEIGHT;
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(now)
    .toLowerCase()
    .replace(" ", "");
  return (
    <>
      {/* Horizontal line extends left via negative margins to span the full week. */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-10 flex items-center"
        style={{ top, left: -9999, right: 0 }}
      >
        <div className="h-[1.5px] w-full bg-rose-500/80" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute z-10 -ml-1 flex items-center"
        style={{ top: top - 6, left: 0 }}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow ring-2 ring-white" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute z-20"
        style={{ top: top - 8, left: -58 }}
      >
        <span className="rounded-md bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow">
          {label}
        </span>
      </div>
    </>
  );
}

function EventChip({
  booking,
  top,
  height,
  leftPct,
  widthPct,
  onClick,
}: {
  booking: Booking;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  onClick: () => void;
}) {
  const theme = statusTheme(booking.status);
  const title = booking.title ?? "Televisit";
  const name = booking.attendee_name ?? "Unknown";
  const short = `${formatClockInClinic(booking.start)} - ${formatClockInClinic(booking.end)}`;
  const tiny = height < 34;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute flex overflow-hidden rounded-md border text-left shadow-sm transition-all",
        theme.chip,
        theme.chipHover,
        "hover:shadow-md hover:z-10"
      )}
      style={{
        top,
        height: Math.max(22, height - 2),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
    >
      <span className={cn("block w-1 shrink-0", theme.accent)} />
      <span className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
        <span className={cn("truncate text-[11px] font-semibold", theme.text)}>
          {title} <span className="ml-1 font-normal opacity-80">{short}</span>
        </span>
        {!tiny && (
          <span className="truncate text-[10px] opacity-70">{name}</span>
        )}
        {!tiny && booking.supabase_patient_id && !booking.patient_supabase_found && (
          <Badge variant="warning" className="mt-0.5 inline-flex px-1 py-0 text-[9px] uppercase tracking-wider">
            unlinked
          </Badge>
        )}
      </span>
    </button>
  );
}

/** Compact "HH:MM" 24-hour clinic-zone time. */
function formatClockInClinic(iso: string): string {
  const h = clinicHour(iso);
  const m = clinicMinute(iso);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Place overlapping events into lanes (Google-Calendar-style). */
function layoutDayEvents(events: Booking[]): Array<{
  booking: Booking;
  laneIndex: number;
  laneCount: number;
}> {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => {
    const sa = new Date(a.start).getTime();
    const sb = new Date(b.start).getTime();
    if (sa !== sb) return sa - sb;
    return new Date(a.end).getTime() - new Date(b.end).getTime();
  });

  const lanes: number[] = [];
  const assignments: Array<{ laneIndex: number }> = [];
  for (const ev of sorted) {
    const startMs = new Date(ev.start).getTime();
    const endMs = new Date(ev.end).getTime();
    let placed = -1;
    for (let i = 0; i < lanes.length; i += 1) {
      if (lanes[i] <= startMs) {
        lanes[i] = endMs;
        placed = i;
        break;
      }
    }
    if (placed === -1) {
      lanes.push(endMs);
      placed = lanes.length - 1;
    }
    assignments.push({ laneIndex: placed });
  }

  const n = sorted.length;
  const overlapCount: number[] = new Array(n).fill(1);
  for (let i = 0; i < n; i += 1) {
    const sI = new Date(sorted[i].start).getTime();
    const eI = new Date(sorted[i].end).getTime();
    let group = 1;
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      const sJ = new Date(sorted[j].start).getTime();
      const eJ = new Date(sorted[j].end).getTime();
      if (sJ < eI && eJ > sI) group += 1;
    }
    overlapCount[i] = group;
  }

  return sorted.map((booking, idx) => ({
    booking,
    laneIndex: assignments[idx].laneIndex,
    laneCount: Math.max(overlapCount[idx], assignments[idx].laneIndex + 1),
  }));
}
