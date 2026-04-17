import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from "date-fns";

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  try {
    const supabase = createServiceClient();
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    const trendFrom = startOfDay(subDays(now, 29)).toISOString();

    const [
      { count: totalPatients },
      { count: totalBookings },
      { count: todayCount },
      { count: weekCount },
      { count: monthCount },
      { count: pendingCount },
      { count: confirmedCount },
      { count: cancelledCount },
      { count: patientsThisWeek },
    ] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", weekStart)
        .lte("start_time", weekEnd),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("start_time", monthStart)
        .lte("start_time", monthEnd),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled"),
      supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStart),
    ]);

    const [{ data: trendRows }, { data: upcoming }, { data: recent }] = await Promise.all([
      supabase
        .from("bookings")
        .select("start_time, status")
        .gte("start_time", trendFrom)
        .order("start_time", { ascending: true }),
      supabase
        .from("bookings")
        .select(
          "id, start_time, end_time, status, attendee_name, attendee_email, cal_booking_id, patient_id, title"
        )
        .gte("start_time", now.toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(6),
      supabase
        .from("bookings")
        .select(
          "id, start_time, end_time, status, attendee_name, attendee_email, cal_booking_id, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const trendBuckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(now, i), "yyyy-MM-dd");
      trendBuckets[key] = 0;
    }
    (trendRows ?? []).forEach((r) => {
      const key = format(new Date(r.start_time as string), "yyyy-MM-dd");
      if (key in trendBuckets) trendBuckets[key] += 1;
    });
    const trend = Object.entries(trendBuckets).map(([date, count]) => ({ date, count }));

    const completedEstimate = (trendRows ?? []).filter(
      (r) => r.status !== "cancelled" && new Date(r.start_time as string).getTime() < now.getTime()
    ).length;

    return NextResponse.json({
      totalPatients: totalPatients ?? 0,
      totalBookings: totalBookings ?? 0,
      todayCount: todayCount ?? 0,
      weekCount: weekCount ?? 0,
      monthCount: monthCount ?? 0,
      pendingCount: pendingCount ?? 0,
      confirmedCount: confirmedCount ?? 0,
      cancelledCount: cancelledCount ?? 0,
      completedLast30: completedEstimate,
      patientsThisWeek: patientsThisWeek ?? 0,
      trend,
      upcoming: upcoming ?? [],
      recent: recent ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
