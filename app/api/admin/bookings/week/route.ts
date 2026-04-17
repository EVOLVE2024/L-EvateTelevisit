import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { listAllCalBookings, type CalBooking } from "@/lib/calBookings";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingDTO = {
  id: string;
  uid: string | null;
  title: string | null;
  status: string;
  start: string;
  end: string;
  duration: number | null;
  meeting_url: string | null;
  location: string | null;
  created_at: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_tz: string | null;
  host_name: string | null;
  supabase_patient_id: string | null;
  patient_supabase_found: boolean;
};

function toDto(b: CalBooking, knownPatientIds: Set<string>): BookingDTO {
  const a = b.attendees[0];
  const h = b.hosts[0];
  const pid = b.supabasePatientId;
  return {
    id: String(b.id ?? b.uid ?? crypto.randomUUID()),
    uid: b.uid,
    title: b.title,
    status: b.status,
    start: b.start,
    end: b.end,
    duration: b.duration,
    meeting_url: b.meetingUrl,
    location: b.location,
    created_at: b.createdAt,
    attendee_name: a?.name ?? null,
    attendee_email: a?.email ?? null,
    attendee_tz: a?.timeZone ?? null,
    host_name: h?.name ?? null,
    supabase_patient_id: pid,
    patient_supabase_found: pid ? knownPatientIds.has(pid) : false,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required ISO timestamps" }, { status: 400 });
  }

  try {
    const bookings = await listAllCalBookings(
      { afterStart: start, beforeEnd: end, sortStart: "asc" },
      { pageSize: 250, maxPages: 10 }
    );

    // Resolve which supabase_id values exist locally so the UI can badge unlinked bookings.
    const pids = Array.from(
      new Set(bookings.map((b) => b.supabasePatientId).filter((v): v is string => Boolean(v)))
    );

    const knownPatientIds = new Set<string>();
    if (pids.length) {
      const supabase = createServiceClient();
      const { data } = await supabase.from("patients").select("id").in("id", pids);
      for (const row of data ?? []) {
        if (row.id) knownPatientIds.add(String(row.id));
      }
    }

    const dtos = bookings.map((b) => toDto(b, knownPatientIds));

    return NextResponse.json({ start, end, bookings: dtos });
  } catch (e) {
    console.error("[admin/bookings/week]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load bookings" },
      { status: 500 }
    );
  }
}
