import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  const id = params.id;
  try {
    const supabase = createServiceClient();
    const [{ data: patient }, { data: mh }, { data: cr }, { data: bookings }] =
      await Promise.all([
        supabase.from("patients").select("id, created_at").eq("id", id).maybeSingle(),
        supabase.from("medical_history").select("*").eq("patient_id", id).maybeSingle(),
        supabase.from("consent_records").select("*").eq("patient_id", id).maybeSingle(),
        supabase
          .from("bookings")
          .select(
            "id, cal_booking_id, cal_booking_uid, status, title, start_time, end_time, timezone, attendee_name, attendee_email, created_at"
          )
          .eq("patient_id", id)
          .order("start_time", { ascending: false }),
      ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      patient,
      medical_history: mh,
      consent: cr,
      bookings: bookings ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
