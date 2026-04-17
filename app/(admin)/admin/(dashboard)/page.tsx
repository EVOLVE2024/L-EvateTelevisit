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
    cal_booking_id: string | null;
    cal_booking_uid: string | null;
    start_time: string;
    end_time: string;
    status: string;
    attendee_name: string | null;
    attendee_email: string | null;
    title: string | null;
  }[];
  recent: {
    id: string;
    cal_booking_id: string | null;
    cal_booking_uid: string | null;
    start_time: string;
    end_time: string;
    status: string;
    attendee_name: string | null;
    attendee_email: string | null;
    created_at: string | null;
  }[];
};

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  return "secondary" as const;
}

function TrendBars({ data }: { data: Stats["trend"] }) {
  const WIDTH = 720;
  const HEIGHT = 160;
  const PAD_X = 8;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 20;
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(1, ...data.map((d) => d.count));
  const yTicks = [0, Math.ceil(max / 2), max];
  const total = data.reduce((s, d) => s + d.count, 0);
  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const barWidth = Math.max(4, (plotW / Math.max(1, data.length)) * 0.6);

  const pointFor = (i: number, count: number) => {
    const x = PAD_X + (data.length > 1 ? i * stepX : plotW / 2);
    const y = PAD_TOP + plotH - (count / max) * plotH;
    return { x, y };
  };

  const linePath = data
    .map((d, i) => {
      const { x, y } = pointFor(i, d.count);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath =
    data.length > 0
      ? `${linePath} L${(PAD_X + (data.length - 1) * stepX).toFixed(2)} ${(PAD_TOP + plotH).toFixed(2)} L${PAD_X.toFixed(2)} ${(PAD_TOP + plotH).toFixed(2)} Z`
      : "";

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-44 w-full"
        role="img"
        aria-label={`Bookings trend, ${total} total across ${data.length} days`}
      >
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => {
          const y = PAD_TOP + plotH - (v / max) * plotH;
          return (
            <g key={i}>
              <line
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeOpacity={i === 0 ? 0.35 : 0.15}
                strokeDasharray={i === 0 ? undefined : "3 4"}
              />
              <text
                x={WIDTH - PAD_X}
                y={y - 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="9"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {v}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const { x, y } = pointFor(i, d.count);
          const barH = d.count === 0 ? 0 : PAD_TOP + plotH - y;
          return (
            <g key={d.date}>
              <title>{`${format(parseISO(d.date), "PP")} — ${d.count} booking${
                d.count === 1 ? "" : "s"
              }`}</title>
              <rect
                x={x - barWidth / 2}
                y={PAD_TOP + plotH - barH}
                width={barWidth}
                height={barH}
                rx={2}
                fill="hsl(var(--primary))"
                fillOpacity={d.count === 0 ? 0 : 0.18}
              />
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#trend-area)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map((d, i) => {
          if (d.count === 0) return null;
          const { x, y } = pointFor(i, d.count);
          return (
            <g key={`dot-${d.date}`}>
              <circle cx={x} cy={y} r={3.5} fill="white" />
              <circle cx={x} cy={y} r={2.5} fill="hsl(var(--primary))" />
            </g>
          );
        })}
      </svg>
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
              <p className="text-sm text-muted-foreground">
                {stats.upcoming.length === 0
                  ? "Nothing scheduled — the next 6 visits will appear here."
                  : `Showing ${stats.upcoming.length} of the next ${Math.max(stats.upcoming.length, 6)} visits`}
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View calendar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {stats.pendingCount > stats.upcoming.filter((b) => b.status === "pending").length && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span>
                {stats.pendingCount} pending booking
                {stats.pendingCount === 1 ? "" : "s"} still need confirmation.{" "}
                <Link
                  href="/admin/bookings"
                  className="font-medium text-amber-900 underline-offset-2 hover:underline"
                >
                  Review on the bookings page
                </Link>
                .
              </span>
            </div>
          )}
          <ul className="mt-5 divide-y divide-[hsl(var(--border))]/10">
            {stats.upcoming.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No upcoming appointments.</li>
            )}
            {stats.upcoming.map((b) => {
              const nowMs = Date.now();
              const startMs = new Date(b.start_time).getTime();
              const endMs = new Date(b.end_time).getTime();
              const inProgress = startMs <= nowMs && endMs >= nowMs;
              return (
                <li key={b.id} className="flex items-center gap-4 py-3">
                  <div
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                      inProgress
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-primary/10 text-primary"
                    )}
                  >
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
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {b.attendee_name ?? "Unnamed patient"}
                      </p>
                      {inProgress && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          In progress
                        </span>
                      )}
                      {!inProgress && startMs > nowMs && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          in {formatDistanceToNow(new Date(b.start_time))}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTimeInClinic(b.start_time)} — {formatTimeInClinic(b.end_time)} {CLINIC_TIMEZONE_ABBR}
                      {b.attendee_email ? ` · ${b.attendee_email}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                </li>
              );
            })}
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
                    {b.created_at
                      ? `Booked ${formatDistanceToNow(parseISO(b.created_at), { addSuffix: true })} · `
                      : ""}
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
