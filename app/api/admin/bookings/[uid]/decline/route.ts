import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { declineCalBooking } from "@/lib/cal";
import { invalidateCalBookingsCache } from "@/lib/calBookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { uid: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const uid = params.uid;
  if (!uid) {
    return NextResponse.json({ error: "uid is required" }, { status: 400 });
  }

  let body: { reason?: unknown } = {};
  try {
    body = (await req.json()) as { reason?: unknown };
  } catch {
    body = {};
  }
  const reason =
    typeof body.reason === "string" && body.reason.trim().length
      ? body.reason.trim()
      : "Declined by host";

  try {
    const result = await declineCalBooking(uid, reason);
    invalidateCalBookingsCache();
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to decline booking";
    console.error("[admin/bookings/decline]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
