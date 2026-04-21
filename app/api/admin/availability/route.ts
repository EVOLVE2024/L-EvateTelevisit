import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import {
  CAL_WEEK_DAYS,
  type CalAvailabilityRange,
  getOrCreateDefaultSchedule,
  updateSchedule,
} from "@/lib/calAvailability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function parseRanges(value: unknown): CalAvailabilityRange[] | null {
  if (!Array.isArray(value)) return null;
  const out: CalAvailabilityRange[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const row = item as Record<string, unknown>;
    const daysRaw = Array.isArray(row.days) ? row.days : [];
    const days = daysRaw
      .map((d) => String(d))
      .filter((d): d is (typeof CAL_WEEK_DAYS)[number] => CAL_WEEK_DAYS.includes(d as (typeof CAL_WEEK_DAYS)[number]));
    if (!days.length || !isValidTime(row.startTime) || !isValidTime(row.endTime)) return null;
    out.push({ days, startTime: row.startTime, endTime: row.endTime });
  }
  return out;
}

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  try {
    const schedule = await getOrCreateDefaultSchedule();
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const scheduleId = Number(body.scheduleId);
    const timeZone = String(body.timeZone ?? "");
    const availability = parseRanges(body.availability);
    if (!Number.isFinite(scheduleId) || !timeZone || !availability) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const updated = await updateSchedule(scheduleId, { timeZone, availability });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update availability" },
      { status: 500 }
    );
  }
}
