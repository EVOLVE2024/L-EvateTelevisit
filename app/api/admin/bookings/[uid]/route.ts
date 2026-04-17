import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { getCalBooking } from "@/lib/calBookings";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { uid: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  try {
    const booking = await getCalBooking(params.uid);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let patient: {
      id: string;
      name: string | null;
      email: string | null;
      cell: string | null;
    } | null = null;

    const pid = booking.supabasePatientId;
    if (pid) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("patients")
        .select("id, medical_history(patient_name, email, cell_number)")
        .eq("id", pid)
        .maybeSingle();
      if (data) {
        const mhRaw = data.medical_history as unknown;
        const mh = (Array.isArray(mhRaw) ? mhRaw[0] : mhRaw) as
          | { patient_name?: string; email?: string; cell_number?: string }
          | null
          | undefined;
        patient = {
          id: String(data.id),
          name: mh?.patient_name ?? null,
          email: mh?.email ?? null,
          cell: mh?.cell_number ?? null,
        };
      }
    }

    return NextResponse.json({ booking, patient });
  } catch (e) {
    console.error("[admin/bookings/[uid]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
