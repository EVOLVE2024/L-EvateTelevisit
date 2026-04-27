import { NextRequest, NextResponse } from "next/server";
import { listAllCalBookings } from "@/lib/calBookings";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data: mh, error } = await supabase
      .from("medical_history")
      .select("email")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (error || !mh?.email) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const email = mh.email as string;

    const normalizedPatientId = patientId.trim().toLowerCase();
    const [upcomingAll, pastAll] = await Promise.all([
      listAllCalBookings(
        { attendeeEmail: email, status: "upcoming", sortStart: "asc" },
        { pageSize: 100, maxPages: 10 }
      ),
      listAllCalBookings(
        { attendeeEmail: email, status: "past", sortStart: "desc" },
        { pageSize: 100, maxPages: 10 }
      ),
    ]);

    const onlyPatientBookings = <
      T extends {
        supabasePatientId: string | null;
      }
    >(
      bookings: T[]
    ) =>
      bookings.filter((booking) => {
        const bookingPatientId = booking.supabasePatientId?.trim().toLowerCase();
        return bookingPatientId === normalizedPatientId;
      });

    const upcoming = onlyPatientBookings(upcomingAll).slice(0, 50);
    const past = onlyPatientBookings(pastAll).slice(0, 50);

    const toItem = (b: (typeof upcoming)[number]) => ({
      uid: b.uid,
      title: b.title,
      status: b.status,
      start: b.start,
      end: b.end,
      duration: b.duration,
      meetingUrl: b.meetingUrl,
      rescheduleUrl: b.rescheduleUrl,
      hostName: b.hosts[0]?.name ?? null,
    });

    return NextResponse.json({
      upcoming: upcoming.map(toItem),
      past: past.map(toItem),
    });
  } catch (e) {
    console.error("[patient/bookings]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load bookings" },
      { status: 500 }
    );
  }
}
