import { NextRequest, NextResponse } from "next/server";
import { fetchCalBooking } from "@/lib/cal";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeStatus,
  shouldApplyStatus,
  statusFromCalRemote,
} from "@/lib/bookingStatus";
import { invalidateCalSlotCache } from "@/lib/calSlotCache";

export const runtime = "nodejs";
// Don't cache — reconciliation must hit Cal.com live every run.
export const dynamic = "force-dynamic";

const LOOKBACK_HOURS = 24;
const LOOKAHEAD_DAYS = 60;
const BATCH_LIMIT = 200;

type LocalRow = {
  id: string;
  cal_booking_id: string;
  cal_booking_uid: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
};

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Allow `?secret=` for manual / curl-based triggers.
  const qs = req.nextUrl.searchParams.get("secret");
  return qs === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, cal_booking_id, cal_booking_uid, status, start_time, end_time")
    .in("status", ["pending", "confirmed", "rescheduled"])
    .gte("start_time", windowStart)
    .lte("start_time", windowEnd)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("[cron/reconcile] query failed", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let checked = 0;
  let updated = 0;
  let missingRemote = 0;
  let failed = 0;
  let slotCacheInvalidated = false;

  for (const row of (rows ?? []) as LocalRow[]) {
    if (!row.cal_booking_uid) continue;
    checked += 1;
    try {
      const remote = await fetchCalBooking(row.cal_booking_uid);
      if (!remote) {
        // Booking no longer exists in Cal.com — treat as cancelled.
        const nextStatus = "cancelled";
        if (shouldApplyStatus(row.status, nextStatus)) {
          await supabase
            .from("bookings")
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          updated += 1;
          slotCacheInvalidated = true;
        }
        missingRemote += 1;
        continue;
      }

      const remoteStatus = statusFromCalRemote(remote.status);
      const patch: Record<string, unknown> = {};

      if (
        remoteStatus !== normalizeStatus(row.status) &&
        shouldApplyStatus(row.status, remoteStatus)
      ) {
        patch.status = remoteStatus;
      }
      if (remote.start && remote.start !== row.start_time) {
        patch.start_time = remote.start;
      }
      if (remote.end && remote.end !== row.end_time) {
        patch.end_time = remote.end;
      }

      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("bookings")
          .update(patch)
          .eq("id", row.id);
        if (updateError) {
          failed += 1;
          console.error("[cron/reconcile] update failed", row.id, updateError);
          continue;
        }
        updated += 1;
        if (patch.status === "cancelled" || patch.start_time || patch.end_time) {
          slotCacheInvalidated = true;
        }
      }
    } catch (e) {
      failed += 1;
      console.error("[cron/reconcile] cal fetch failed", row.cal_booking_uid, e);
    }
  }

  if (slotCacheInvalidated) {
    invalidateCalSlotCache();
  }

  return NextResponse.json({
    ok: true,
    checked,
    updated,
    missing_remote: missingRemote,
    failed,
    window: { start: windowStart, end: windowEnd },
    ran_at: now.toISOString(),
  });
}
