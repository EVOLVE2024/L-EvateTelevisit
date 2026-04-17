import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  listAllCalBookings,
  listCalBookings,
  type CalBooking,
} from "@/lib/calBookings";
import {
  addDaysToKey,
  clinicDateKey,
  clinicWeekStartKey,
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpcomingRow = {
  id: string;
  cal_booking_id: string | null;
  cal_booking_uid: string | null;
  start_time: string;
  end_time: string;
  status: string;
  title: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
};

type RecentRow = UpcomingRow & { created_at: string | null };

function toUpcoming(b: CalBooking): UpcomingRow {
  return {
    id: String(b.id ?? b.uid ?? crypto.randomUUID()),
    cal_booking_id: b.id != null ? String(b.id) : null,
    cal_booking_uid: b.uid,
    start_time: b.start,
    end_time: b.end,
    status: b.status,
    title: b.title,
    attendee_name: b.attendees[0]?.name ?? null,
    attendee_email: b.attendees[0]?.email ?? null,
  };
}

function toRecent(b: CalBooking): RecentRow {
  return { ...toUpcoming(b), created_at: b.createdAt };
}

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const nowMs = now.getTime();

    // Day/week/month boundaries computed in clinic TZ, not server-local.
    const todayKey = clinicDateKey(now);
    const weekStartKey = clinicWeekStartKey(now, 0);
    const weekKeys = new Set(
      Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStartKey, i))
    );
    const monthPrefix = todayKey.slice(0, 7);

    const trendKeys: string[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      trendKeys.push(clinicDateKey(subDays(now, i)));
    }
    // 31-day buffer absorbs DST + clinic→UTC conversion edges.
    const trendFromIso = new Date(nowMs - 31 * 24 * 60 * 60 * 1000).toISOString();

    // Single wide fetch powers trend, upcoming, recent, and all status counts.
    const [
      { count: totalPatients },
      { count: patientsThisWeek },
      totalPage,
      windowBookings,
    ] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString()),
      listCalBookings({ take: 1 }),
      listAllCalBookings(
        { afterStart: trendFromIso, sortStart: "asc" },
        { pageSize: 250 }
      ),
    ]);

    const totalBookings = totalPage.pagination.totalItems ?? windowBookings.length;

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let completedLast30 = 0;

    const trendBuckets: Record<string, number> = Object.fromEntries(
      trendKeys.map((k) => [k, 0])
    );

    for (const b of windowBookings) {
      if (!b.start) continue;
      const startMs = new Date(b.start).getTime();
      const endMs = b.end ? new Date(b.end).getTime() : startMs;
      const key = clinicDateKey(b.start);

      if (b.status === "pending") pendingCount += 1;
      else if (b.status === "confirmed") confirmedCount += 1;
      else if (b.status === "cancelled") cancelledCount += 1;

      if (key === todayKey) todayCount += 1;
      if (weekKeys.has(key)) weekCount += 1;
      if (key.startsWith(monthPrefix)) monthCount += 1;

      if (key in trendBuckets) trendBuckets[key] += 1;

      // Completed = ended in the past and not cancelled.
      if (b.status !== "cancelled" && endMs < nowMs && key in trendBuckets) {
        completedLast30 += 1;
      }
    }

    const trend = trendKeys.map((date) => ({ date, count: trendBuckets[date] ?? 0 }));

    // Use end >= now (not start) so in-progress meetings still surface as upcoming.
    const upcoming = windowBookings
      .filter((b) => {
        if (b.status === "cancelled") return false;
        const endMs = b.end ? new Date(b.end).getTime() : new Date(b.start).getTime();
        return endMs >= nowMs;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 6)
      .map(toUpcoming);

    const recent = [...windowBookings]
      .sort((a, b) => {
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cb - ca;
      })
      .slice(0, 8)
      .map(toRecent);

    return NextResponse.json({
      totalPatients: totalPatients ?? 0,
      totalBookings,
      todayCount,
      weekCount,
      monthCount,
      pendingCount,
      confirmedCount,
      cancelledCount,
      completedLast30,
      patientsThisWeek: patientsThisWeek ?? 0,
      trend,
      upcoming,
      recent,
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
