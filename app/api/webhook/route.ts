import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { shouldApplyStatus, statusFromCalTrigger } from "@/lib/bookingStatus";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const rawBody = await req.text();
  const signature = req.headers.get("x-cal-signature-256");
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  if (!signature || !safeEqual(signature, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let parsed: { triggerEvent?: string; payload?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody) as { triggerEvent?: string; payload?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const triggerEvent = parsed.triggerEvent ?? "";
  const payload = (parsed.payload ?? parsed) as Record<string, unknown>;

  const bookingId =
    (payload.bookingId as string | number | undefined) ??
    (payload.id as string | number | undefined) ??
    null;
  if (bookingId == null) {
    return NextResponse.json({ received: true, skipped: true });
  }
  const calBookingId = String(bookingId);

  const responses = (payload.responses as Record<string, { value?: string }> | undefined) ?? undefined;
  const attendees = (payload.attendees as { name?: string; email?: string }[] | undefined) ?? undefined;
  const metadata = (payload.metadata as { patient_id?: string } | undefined) ?? undefined;
  const nextStatus = statusFromCalTrigger(triggerEvent);

  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("bookings")
      .select("status")
      .eq("cal_booking_id", calBookingId)
      .maybeSingle();

    // Monotonic guard: if an out-of-order or replayed event would
    // regress the status (e.g. a late BOOKING_CREATED arriving after
    // BOOKING_CONFIRMED), skip the status change but still refresh the
    // other fields so we don't lose a reschedule's new time.
    const applyStatus = shouldApplyStatus(existing?.status, nextStatus);

    const base = {
      patient_id: metadata?.patient_id ?? null,
      cal_booking_id: calBookingId,
      cal_booking_uid: payload.uid != null ? String(payload.uid) : null,
      title: payload.title != null ? String(payload.title) : null,
      start_time: (payload.startTime as string) ?? new Date().toISOString(),
      end_time: (payload.endTime as string) ?? (payload.startTime as string) ?? new Date().toISOString(),
      timezone:
        (responses?.timeZone?.value as string | undefined) ??
        (payload.timeZone as string | undefined) ??
        null,
      attendee_name: responses?.name?.value ?? attendees?.[0]?.name ?? null,
      attendee_email: responses?.email?.value ?? attendees?.[0]?.email ?? null,
      cal_raw_payload: { triggerEvent, payload },
      updated_at: new Date().toISOString(),
    };

    const row = applyStatus ? { ...base, status: nextStatus } : base;

    await supabase.from("bookings").upsert(row, { onConflict: "cal_booking_id" });

    return NextResponse.json({
      received: true,
      applied_status: applyStatus ? nextStatus : "skipped",
    });
  } catch (e) {
    console.error("[webhook] persist failed", e);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }
}
