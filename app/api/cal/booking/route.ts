import { NextRequest, NextResponse } from "next/server";
import { createCalBooking } from "@/lib/cal";
// import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { createServiceClient } from "@/lib/supabase/service";

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
  // Human verification is temporarily disabled.
  // const ok = await verifyRecaptchaToken(body.recaptchaToken);
  // if (!ok) {
  //   return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400 });
  // }
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
      typeof timeZone === "string" && timeZone.trim()
        ? timeZone.trim()
        : Intl.DateTimeFormat().resolvedOptions().timeZone;
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
    const calId = booking?.id != null ? String(booking.id) : null;
    const calUid = booking?.uid != null ? String(booking.uid) : null;
    if (!calId || !calUid) {
      return NextResponse.json({ error: "Cal booking response missing booking identifiers" }, { status: 502 });
    }

    await supabase.from("bookings").upsert(
      {
        patient_id: patientId,
        cal_booking_id: calId,
        cal_booking_uid: calUid,
        status: "pending",
        title: booking?.title ?? null,
        start_time: booking?.start ?? slotTime,
        end_time: booking?.end ?? slotTime,
        timezone: resolvedTimeZone,
        attendee_name: mh.patient_name,
        attendee_email: mh.email,
        cal_raw_payload: calResponse as object,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cal_booking_id" }
    );

    return NextResponse.json({
      ok: true,
      booking: {
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
