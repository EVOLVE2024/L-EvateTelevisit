import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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

  const statusMap: Record<string, string> = {
    BOOKING_CREATED: "pending",
    BOOKING_CONFIRMED: "confirmed",
    BOOKING_CANCELLED: "cancelled",
    BOOKING_RESCHEDULED: "rescheduled",
    BOOKING_REJECTED: "cancelled",
  };

  const bookingId =
    (payload.bookingId as string | number | undefined) ??
    (payload.id as string | number | undefined) ??
    null;
  if (bookingId == null) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const responses = (payload.responses as Record<string, { value?: string }> | undefined) ?? undefined;
  const attendees = (payload.attendees as { name?: string; email?: string }[] | undefined) ?? undefined;

  try {
    const supabase = createServiceClient();
    const metadata = (payload.metadata as { patient_id?: string } | undefined) ?? undefined;
    await supabase.from("bookings").upsert(
      {
        patient_id: metadata?.patient_id ?? null,
        cal_booking_id: String(bookingId),
        cal_booking_uid: payload.uid != null ? String(payload.uid) : null,
        status: statusMap[triggerEvent] ?? "pending",
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
      },
      { onConflict: "cal_booking_id" }
    );
  } catch {
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
