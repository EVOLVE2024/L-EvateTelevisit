import { NextRequest, NextResponse } from "next/server";
import { fetchCalSlotsRange } from "@/lib/cal";
import { getCachedSlots, setCachedSlots } from "@/lib/calSlotCache";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }
  const cacheKey = `${start}|${end}`;
  const cached = getCachedSlots(cacheKey);
  if (cached) {
    return NextResponse.json({ slotsByDate: cached.slotsByDate, cached: true });
  }
  try {
    const days = await fetchCalSlotsRange(start, end);
    const slotsByDate: Record<string, string[]> = {};
    for (const d of days) {
      if (d.slots.length) slotsByDate[d.date] = d.slots;
    }
    setCachedSlots(cacheKey, slotsByDate);
    return NextResponse.json({ slotsByDate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slots";
    console.error("[cal-slots]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
