import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { listAllCalBookings, type CalBooking } from "@/lib/calBookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function toBookingRow(b: CalBooking) {
  const attendee = b.attendees[0] ?? { name: null, email: null, timeZone: null };
  return {
    id: String(b.id ?? b.uid ?? ""),
    cal_booking_id: b.id != null ? String(b.id) : null,
    cal_booking_uid: b.uid,
    status: b.status,
    title: b.title,
    start_time: b.start,
    end_time: b.end,
    timezone: attendee.timeZone,
    attendee_name: attendee.name,
    attendee_email: attendee.email,
    created_at: b.createdAt,
    meeting_url: b.meetingUrl,
    location: b.location,
    cancellation_reason: b.cancellationReason,
    supabase_patient_id: b.supabasePatientId,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  const id = params.id;

  try {
    const supabase = createServiceClient();
    const [{ data: patient }, { data: mh }, { data: cr }] = await Promise.all([
      supabase.from("patients").select("id, created_at").eq("id", id).maybeSingle(),
      supabase.from("medical_history").select("*").eq("patient_id", id).maybeSingle(),
      supabase.from("consent_records").select("*").eq("patient_id", id).maybeSingle(),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Pull patient's bookings from Cal.com: match by (email + name), or
    // fall back to bookings whose supabase_id field matches this patient.
    let bookings: ReturnType<typeof toBookingRow>[] = [];
    if (mh?.email || mh?.patient_name) {
      const nameKey = normalize(mh?.patient_name);
      const emailKey = normalize(mh?.email);

      const all = await listAllCalBookings(
        {
          attendeeEmail: mh?.email ?? undefined,
          sortStart: "desc",
        },
        { pageSize: 100, maxPages: 10 }
      );

      bookings = all
        .filter((b) => {
          if (b.supabasePatientId && b.supabasePatientId === id) return true;
          const a = b.attendees[0];
          if (!a) return false;
          return normalize(a.email) === emailKey && normalize(a.name) === nameKey;
        })
        .map(toBookingRow);
    }

    return NextResponse.json({
      patient,
      medical_history: mh,
      consent: cr
        ? {
            ...cr,
            driver_license_available: Boolean(cr.driver_license_object_path),
          }
        : null,
      bookings,
    });
  } catch (e) {
    console.error("[admin/patients/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
