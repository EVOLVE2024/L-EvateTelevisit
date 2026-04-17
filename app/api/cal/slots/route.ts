import { NextRequest, NextResponse } from "next/server";
import { fetchCalSlotsRange } from "@/lib/cal";

const SLOT_CACHE_TTL_MS = 60_000;
const slotCache = new Map<string, { expiresAt: number; slotsByDate: Record<string, string[]> }>();

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }
  const cacheKey = `${start}|${end}`;
  const cached = slotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ slotsByDate: cached.slotsByDate, cached: true });
  }
  try {
    const days = await fetchCalSlotsRange(start, end);
    const slotsByDate: Record<string, string[]> = {};
    for (const d of days) {
      slotsByDate[d.date] = d.slots;
    }
    slotCache.set(cacheKey, {
      expiresAt: Date.now() + SLOT_CACHE_TTL_MS,
      slotsByDate,
    });
    return NextResponse.json({ slotsByDate });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slots";
    console.error("[cal-slots]", message);
    if (cached) {
      return NextResponse.json({
        slotsByDate: cached.slotsByDate,
        cached: true,
        warning: "Using cached availability due to temporary sync issue",
      });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
