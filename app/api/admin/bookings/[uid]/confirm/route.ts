import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { confirmCalBooking } from "@/lib/cal";
import { invalidateCalBookingsCache } from "@/lib/calBookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { uid: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const uid = params.uid;
  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  try {
    const result = await confirmCalBooking(uid);
    invalidateCalBookingsCache();
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to confirm booking";
    console.error("[admin/bookings/confirm]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
