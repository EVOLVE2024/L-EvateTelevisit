"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  CLINIC_TIMEZONE_ABBR,
  formatDayOfMonthInClinic,
  formatMediumDateTimeInClinic,
  formatMonthShortInClinic,
  formatTimeInClinic,
} from "@/lib/time";
import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Stats = {
  totalPatients: number;
  totalBookings: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
  completedLast30: number;
  patientsThisWeek: number;
  trend: { date: string; count: number }[];
  upcoming: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    attendee_name: string | null;
    attendee_email: string | null;
    patient_id: string | null;
    title: string | null;
  }[];
  recent: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    attendee_name: string | null;
    attendee_email: string | null;
    cal_booking_id: string;
    created_at: string;
  }[];
};

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  return "secondary" as const;
}

function TrendBars({ data }: { data: Stats["trend"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total / Math.max(1, data.length);

  return (
    <div className="flex h-40 items-end gap-[3px]">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        const aboveAvg = d.count >= avg && d.count > 0;
        return (
          <div
            key={d.date}
            className="group relative flex flex-1 items-end"
            title={`${format(parseISO(d.date), "PP")} — ${d.count} booking${d.count === 1 ? "" : "s"}`}
          >
            <div
              className={cn(
                "w-full rounded-t-md transition-all",
                d.count === 0
                  ? "bg-[hsl(var(--surface-low))]"
                  : aboveAvg
                  ? "bg-primary"
                  : "bg-primary/45",
                "group-hover:opacity-90"
              )}
              style={{ height: `${Math.max(pct, d.count === 0 ? 4 : 10)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {count} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-low))]">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) return;
      setStats(await res.json());
    })();
  }, []);

  const statusTotal = useMemo(() => {
    if (!stats) return 0;
    return stats.confirmedCount + stats.pendingCount + stats.cancelledCount;
  }, [stats]);

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-ambient sm:p-8">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
              Facility Overview
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, Dr. Aris
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening across your televisit practice today, this week, and this month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Activity className="h-3.5 w-3.5" /> Operations Normal
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Clock className="h-3.5 w-3.5" /> {format(new Date(), "EEEE, MMM d")}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients}
          hint={`${stats.patientsThisWeek} new this week`}
          icon={Users}
          tone="primary"
        />
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings}
          hint={`${stats.monthCount} this month`}
          icon={CalendarDays}
          tone="sky"
        />
        <StatsCard
          title="Today"
          value={stats.todayCount}
          hint="Appointments scheduled"
          icon={CalendarClock}
          tone="violet"
        />
        <StatsCard
          title="This Week"
          value={stats.weekCount}
          hint="Across all statuses"
          icon={CalendarCheck}
          tone="emerald"
        />
        <StatsCard
          title="Pending"
          value={stats.pendingCount}
          hint="Awaiting confirmation"
          icon={Clock}
          tone="amber"
        />
        <StatsCard
          title="Confirmed"
          value={stats.confirmedCount}
          hint="Ready to see"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatsCard
          title="Cancelled"
          value={stats.cancelledCount}
          hint="All time"
          icon={XCircle}
          tone="rose"
        />
        <StatsCard
          title="Completed (30d)"
          value={stats.completedLast30}
          hint="Visits concluded"
          icon={TrendingUp}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Bookings Trend</h2>
              <p className="text-sm text-muted-foreground">Last 30 days of appointment volume</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.trend.reduce((s, d) => s + d.count, 0)} total
            </div>
          </div>
          <div className="mt-6">
            <TrendBars data={stats.trend} />
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{format(parseISO(stats.trend[0]?.date ?? new Date().toISOString()), "MMM d")}</span>
              <span>
                {format(
                  parseISO(stats.trend[stats.trend.length - 1]?.date ?? new Date().toISOString()),
                  "MMM d"
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6 shadow-sm">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Status Mix</h2>
            <p className="text-sm text-muted-foreground">All bookings by status</p>
          </div>
          <div className="mt-5 space-y-4">
            <StatusBar
              label="Confirmed"
              count={stats.confirmedCount}
              total={statusTotal}
              color="bg-emerald-500"
            />
            <StatusBar
              label="Pending"
              count={stats.pendingCount}
              total={statusTotal}
              color="bg-amber-500"
            />
            <StatusBar
              label="Cancelled"
              count={stats.cancelledCount}
              total={statusTotal}
              color="bg-rose-500"
            />
          </div>
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary to-primary-dim p-5 text-primary-foreground">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
              <UserPlus className="h-3.5 w-3.5" /> Growth
            </div>
            <p className="mt-2 font-display text-2xl font-semibold">
              +{stats.patientsThisWeek}
            </p>
            <p className="mt-1 text-xs text-primary-foreground/80">
              New patients onboarded this week
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Upcoming Appointments</h2>
              <p className="text-sm text-muted-foreground">Next 6 scheduled visits</p>
            </div>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View calendar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-5 divide-y divide-[hsl(var(--border))]/10">
            {stats.upcoming.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No upcoming appointments.</li>
            )}
            {stats.upcoming.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <div className="text-center leading-tight">
                    <div className="text-[10px] font-medium uppercase tracking-wider">
                      {formatMonthShortInClinic(b.start_time)}
                    </div>
                    <div className="font-display text-lg font-semibold">
                      {formatDayOfMonthInClinic(b.start_time)}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.attendee_name ?? "Unnamed patient"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTimeInClinic(b.start_time)} — {formatTimeInClinic(b.end_time)} {CLINIC_TIMEZONE_ABBR}
                    {b.attendee_email ? ` · ${b.attendee_email}` : ""}
                  </p>
                </div>
                <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Latest booking events</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {stats.recent.length === 0 && (
              <li className="text-sm text-muted-foreground">No recent activity.</li>
            )}
            {stats.recent.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 px-4 py-3"
              >
                <div
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    b.status === "confirmed" && "bg-emerald-500",
                    b.status === "pending" && "bg-amber-500",
                    b.status === "cancelled" && "bg-rose-500",
                    !["confirmed", "pending", "cancelled"].includes(b.status) && "bg-slate-400"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {b.attendee_name ?? "Unnamed patient"}
                    <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">
                      {b.status}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Booked {formatDistanceToNow(parseISO(b.created_at), { addSuffix: true })} ·{" "}
                    {formatMediumDateTimeInClinic(b.start_time)} {CLINIC_TIMEZONE_ABBR}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
