import { NextRequest, NextResponse } from "next/server";
import { listCalBookings } from "@/lib/calBookings";
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

    const [upcoming, past] = await Promise.all([
      listCalBookings({ attendeeEmail: email, status: "upcoming", sortStart: "asc", take: 50 }),
      listCalBookings({ attendeeEmail: email, status: "past", sortStart: "desc", take: 50 }),
    ]);

    const toItem = (b: (typeof upcoming.bookings)[number]) => ({
      uid: b.uid,
      title: b.title,
      status: b.status,
      start: b.start,
      end: b.end,
      duration: b.duration,
      meetingUrl: b.meetingUrl,
      hostName: b.hosts[0]?.name ?? null,
    });

    return NextResponse.json({
      upcoming: upcoming.bookings.map(toItem),
      past: past.bookings.map(toItem),
    });
  } catch (e) {
    console.error("[patient/bookings]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load bookings" },
      { status: 500 }
    );
  }
}
