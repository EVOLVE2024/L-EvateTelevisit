"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronDown,
  Mail,
  Phone,
  Search,
  Video,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingActions } from "@/components/admin/BookingActions";
import { BookingDetailDrawer } from "@/components/admin/BookingDetailDrawer";
import { PatientDetailDrawer } from "@/components/admin/PatientDetailDrawer";
import { cn } from "@/lib/utils";
import {
  CLINIC_TIMEZONE_ABBR,
  addDaysToKey,
  clinicDateKey,
  clinicGmtOffset,
  formatTimeInClinic,
} from "@/lib/time";

type ViewFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

type RangePreset =
  | "today"
  | "last7"
  | "last30"
  | "last90"
  | "mtd"
  | "ytd"
  | "custom";

type DateRange = {
  preset: RangePreset;
  /** yyyy-MM-dd, clinic TZ, inclusive. */
  fromKey: string;
  /** yyyy-MM-dd, clinic TZ, inclusive. */
  toKey: string;
};

type BookingRow = {
  id: string;
  uid: string | null;
  title: string | null;
  status: string;
  start: string;
  end: string;
  duration: number | null;
  meeting_url: string | null;
  created_at: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  host_name: string | null;
  supabase_patient_id: string | null;
  patient_supabase_found: boolean;
  patient_phone: string | null;
};

function initials(name: string | null) {
  if (!name) return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  if (s === "rescheduled") return "secondary" as const;
  return "secondary" as const;
}

const VIEWS: Array<{ id: ViewFilter; label: string; dot: string }> = [
  { id: "upcoming", label: "Upcoming", dot: "bg-emerald-500" },
  { id: "unconfirmed", label: "Pending", dot: "bg-amber-500" },
  { id: "past", label: "Past", dot: "bg-slate-500" },
  { id: "cancelled", label: "Cancelled", dot: "bg-rose-500" },
];

const RANGE_PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "last90", label: "Last 90 Days" },
  { id: "mtd", label: "Month To Date" },
  { id: "ytd", label: "Year To Date" },
  { id: "custom", label: "Custom Range" },
];

function computePresetRange(preset: Exclude<RangePreset, "custom">): DateRange {
  const todayKey = clinicDateKey(new Date());
  switch (preset) {
    case "today":
      return { preset, fromKey: todayKey, toKey: todayKey };
    case "last7":
      return { preset, fromKey: addDaysToKey(todayKey, -6), toKey: todayKey };
    case "last30":
      return { preset, fromKey: addDaysToKey(todayKey, -29), toKey: todayKey };
    case "last90":
      return { preset, fromKey: addDaysToKey(todayKey, -89), toKey: todayKey };
    case "mtd":
      return { preset, fromKey: `${todayKey.slice(0, 7)}-01`, toKey: todayKey };
    case "ytd":
      return { preset, fromKey: `${todayKey.slice(0, 4)}-01-01`, toKey: todayKey };
  }
}

function rangeLabel(r: DateRange): string {
  const preset = RANGE_PRESETS.find((p) => p.id === r.preset);
  if (preset && r.preset !== "custom") return preset.label;
  return `${r.fromKey} → ${r.toKey}`;
}

/** Convert a clinic-TZ date key to a UTC ISO at clinic midnight (DST-safe). */
function clinicKeyToIso(key: string, endOfDay: boolean): string {
  const off = clinicGmtOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.abs(off)).padStart(2, "0");
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${key}T${time}${sign}${hh}:00`).toISOString();
}

export function BookingsList() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [view, setView] = useState<ViewFilter>("upcoming");
  const [pastRange, setPastRange] = useState<DateRange>(() =>
    computePresetRange("last7")
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          view,
          search,
        });
        if (view === "past") {
          params.set("from", clinicKeyToIso(pastRange.fromKey, false));
          params.set("to", clinicKeyToIso(pastRange.toKey, true));
        }
        try {
          const res = await fetch(`/api/admin/bookings/list?${params.toString()}`, {
            cache: "no-store",
          });
          const data = (await res.json()) as {
            rows?: BookingRow[];
            total?: number;
            hasMore?: boolean;
            error?: string;
          };
          if (!active) return;
          if (res.ok) {
            setRows(data.rows ?? []);
            setTotal(data.total ?? 0);
            setHasMore(data.hasMore ?? false);
          } else {
            setError(data.error ?? "Could not load bookings.");
            setRows([]);
          }
        } catch (e) {
          if (!active) return;
          setError(e instanceof Error ? e.message : "Network error");
          setRows([]);
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, pageSize, view, search, refreshTick, pastRange.fromKey, pastRange.toKey]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  function refresh() {
    setRefreshTick((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-4 shadow-ambient lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[28rem] lg:w-[32rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or email"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          {view === "past" && (
            <DateRangeMenu
              value={pastRange}
              onChange={(r) => {
                setPage(1);
                setPastRange(r);
              }}
            />
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 p-0.5">
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setPage(1);
                  setView(v.id);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] shadow-ambient">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="w-[120px]">Duration</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[240px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const name = r.attendee_name ?? "Unknown";
                const day = r.start ? format(parseISO(r.start), "EEE, MMM d") : "—";
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-[hsl(var(--surface-low))]/50"
                    onClick={() => r.uid && setSelectedUid(r.uid)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.title ?? "Televisit"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {r.attendee_email && (
                          <p className="inline-flex items-center gap-1.5 truncate text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {r.attendee_email}
                          </p>
                        )}
                        {r.patient_phone && (
                          <p className="inline-flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {r.patient_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{day}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.start ? formatTimeInClinic(r.start) : "—"}
                            {" – "}
                            {r.end ? formatTimeInClinic(r.end) : "—"}{" "}
                            <span className="font-mono text-[10px] uppercase tracking-wider">
                              {CLINIC_TIMEZONE_ABBR}
                            </span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {r.duration ? `${r.duration} min` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={statusVariant(r.status)} className="capitalize">
                          {r.status}
                        </Badge>
                        {r.supabase_patient_id && !r.patient_supabase_found && (
                          <Badge
                            variant="warning"
                            className="px-1.5 py-0 text-[9px] uppercase tracking-wider"
                          >
                            unlinked
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.status === "pending" ? (
                          <BookingActions
                            uid={r.uid}
                            status={r.status}
                            size="sm"
                            onCompleted={refresh}
                          />
                        ) : r.meeting_url ? (
                          <a
                            href={r.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Meeting
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </>
          ) : (
            "No results"
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={(!hasMore && page >= totalPages) || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <BookingDetailDrawer
        uid={selectedUid}
        onClose={() => setSelectedUid(null)}
        onChanged={refresh}
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

function DateRangeMenu({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(value.preset === "custom");
  const [customFrom, setCustomFrom] = useState(value.fromKey);
  const [customTo, setCustomTo] = useState(value.toKey);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function pick(preset: RangePreset) {
    if (preset === "custom") {
      setCustomOpen(true);
      setCustomFrom(value.fromKey);
      setCustomTo(value.toKey);
      return;
    }
    setCustomOpen(false);
    onChange(computePresetRange(preset));
    setOpen(false);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const fromKey = customFrom <= customTo ? customFrom : customTo;
    const toKey = customFrom <= customTo ? customTo : customFrom;
    onChange({ preset: "custom", fromKey, toKey });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0 items-center gap-2">
      <div className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))]/50 pl-3 pr-1.5 text-sm">
        <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          Date Range
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-w-[140px] items-center justify-between gap-2 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[hsl(var(--surface-high))]"
        >
          <span className="whitespace-nowrap">{rangeLabel(value)}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
        {value.preset !== "last7" && (
          <button
            type="button"
            onClick={() => onChange(computePresetRange("last7"))}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-high))] hover:text-foreground"
            aria-label="Reset date range"
            title="Reset to Last 7 Days"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[280px] overflow-hidden rounded-xl border border-[hsl(var(--border))]/20 bg-white shadow-lg">
          <ul className="p-1">
            {RANGE_PRESETS.map((p) => {
              const active = value.preset === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-[hsl(var(--surface-low))]/60"
                    )}
                  >
                    <span>{p.label}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {customOpen && (
            <div className="border-t border-[hsl(var(--border))]/10 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-lg border border-[hsl(var(--border))]/30 bg-white px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-lg border border-[hsl(var(--border))]/30 bg-white px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCustomOpen(false);
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!customFrom || !customTo}
                  onClick={applyCustom}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          <div className="border-t border-[hsl(var(--border))]/10 p-1">
            <button
              type="button"
              onClick={() => {
                onChange(computePresetRange("last7"));
                setOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--surface-low))]/60"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
