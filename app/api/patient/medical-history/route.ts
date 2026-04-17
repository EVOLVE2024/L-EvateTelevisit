import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { medicalHistoryRowToFormValues } from "@/lib/medicalHistory/mapDbToForm";

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("medical_history").select("*").eq("patient_id", patientId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ medicalHistory: null });
    return NextResponse.json({ medicalHistory: medicalHistoryRowToFormValues(data) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
