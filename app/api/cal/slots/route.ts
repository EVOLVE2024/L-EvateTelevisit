import { NextRequest, NextResponse } from "next/server";
import { fetchCalSlotsRange } from "@/lib/cal";
import { getCachedSlots, setCachedSlots } from "@/lib/calSlotCache";
import { createServiceClient } from "@/lib/supabase/service";

async function fetchPatientBookedStartTimes(patientId: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (!patientId) return out;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("start_time, status")
      .eq("patient_id", patientId)
      .neq("status", "cancelled");
    if (error || !data) return out;
    for (const row of data) {
      if (row.start_time) out.add(new Date(row.start_time as string).toISOString());
    }
  } catch {
    /* non-fatal: fall back to returning all slots */
  }
  return out;
}

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  const patientId = req.nextUrl.searchParams.get("patientId") ?? "";
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }
  const cacheKey = `${start}|${end}|${patientId}`;
  const cached = getCachedSlots(cacheKey);
  if (cached) {
    return NextResponse.json({ slotsByDate: cached.slotsByDate, cached: true });
  }
  try {
    const [days, patientBookedTimes] = await Promise.all([
      fetchCalSlotsRange(start, end),
      fetchPatientBookedStartTimes(patientId),
    ]);
    const slotsByDate: Record<string, string[]> = {};
    for (const d of days) {
      const filtered = patientBookedTimes.size
        ? d.slots.filter((iso) => !patientBookedTimes.has(new Date(iso).toISOString()))
        : d.slots;
      if (filtered.length) slotsByDate[d.date] = filtered;
    }
    setCachedSlots(cacheKey, slotsByDate);
    return NextResponse.json({ slotsByDate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slots";
    console.error("[cal-slots]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
