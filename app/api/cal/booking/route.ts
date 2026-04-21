import { NextRequest, NextResponse } from "next/server";
import { createCalBooking } from "@/lib/cal";
import { createServiceClient } from "@/lib/supabase/service";
import { invalidateCalSlotCache } from "@/lib/calSlotCache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { slotTime?: string; recaptchaToken?: string; patientId?: string; timeZone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { slotTime, patientId, timeZone } = body;
  if (!slotTime || !patientId) {
    return NextResponse.json({ error: "slotTime and patientId required" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data: mh, error } = await supabase
      .from("medical_history")
      .select("patient_name, email")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (error || !mh) {
      return NextResponse.json({ error: "Patient medical history not found" }, { status: 400 });
    }

    const resolvedTimeZone =
      typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "America/New_York";

    const calResponse = await createCalBooking({
      start: slotTime,
      name: mh.patient_name,
      email: mh.email,
      timeZone: resolvedTimeZone,
      patientId,
    });
    const data = calResponse as {
      data?: { id?: number | string; uid?: string; start?: string; end?: string; title?: string };
    };
    const booking = data.data;

    // Cal.com is the source of truth; patient ↔ booking link is set via
    // `bookingFieldsResponses.supabase_id` inside `createCalBooking`.
    invalidateCalSlotCache();

    return NextResponse.json({
      ok: true,
      booking: {
        uid: booking?.uid ?? null,
        start: booking?.start ?? slotTime,
        end: booking?.end ?? null,
        title: booking?.title ?? null,
        name: mh.patient_name,
        email: mh.email,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Booking failed";
    console.error("[cal-booking]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
