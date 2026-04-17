import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findDuplicatePatient } from "@/lib/patientDuplicate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; patientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").toString();
  const email = (body.email ?? "").toString();
  const excludePatientId = body.patientId?.toString();

  if (!name.trim() || !email.trim()) {
    return NextResponse.json({ duplicate: false });
  }

  try {
    const supabase = createServiceClient();
    const result = await findDuplicatePatient(supabase, { name, email, excludePatientId });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[check-duplicate]", e);
    return NextResponse.json({ error: "Duplicate check failed" }, { status: 500 });
  }
}
