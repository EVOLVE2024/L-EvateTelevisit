import { NextRequest, NextResponse } from "next/server";
import { cancelCalBooking } from "@/lib/cal";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;
  let body: { uid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
  try {
    await cancelCalBooking(body.uid);
    const supabase = createServiceClient();
    await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("cal_booking_uid", body.uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cancel failed" },
      { status: 502 }
    );
  }
}
