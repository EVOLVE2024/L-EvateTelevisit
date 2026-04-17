import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { medicalHistoryFormSchema } from "@/lib/schemas/medicalHistory";
import { consentSchema } from "@/lib/schemas/consent";
import { createServiceClient } from "@/lib/supabase/service";
import { medicalHistoryFormToDbRow } from "@/lib/medicalHistory/mapFormToRow";
import { medicalHistoryRowToFormValues } from "@/lib/medicalHistory/mapDbToForm";
import { findDuplicatePatient } from "@/lib/patientDuplicate";

const bodySchema = z.object({
  patientId: z.string().uuid(),
  medicalHistory: medicalHistoryFormSchema.optional(),
  consent: consentSchema,
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { patientId, medicalHistory: medicalFromBody, consent } = parsed.data;

  try {
    const supabase = createServiceClient();

    let medicalValues = medicalFromBody;
    if (!medicalValues) {
      const { data: existing, error: loadErr } = await supabase
        .from("medical_history")
        .select("*")
        .eq("patient_id", patientId)
        .maybeSingle();
      if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
      if (!existing) {
        return NextResponse.json({ error: "Medical history is required to complete intake" }, { status: 400 });
      }
      medicalValues = medicalHistoryRowToFormValues(existing);
    }

    const dup = await findDuplicatePatient(supabase, {
      name: medicalValues.patient_name,
      email: medicalValues.email,
      excludePatientId: patientId,
    });
    if (dup.duplicate) {
      return NextResponse.json(
        {
          error: "A patient with this name and email combination already exists.",
          code: "duplicate_patient",
        },
        { status: 409 }
      );
    }

    const { error: patientErr } = await supabase
      .from("patients")
      .upsert({ id: patientId }, { onConflict: "id", ignoreDuplicates: true });
    if (patientErr) return NextResponse.json({ error: patientErr.message }, { status: 500 });

    const medicalRow = medicalHistoryFormToDbRow(patientId, medicalValues);
    const { error: mhErr } = await supabase.from("medical_history").upsert(medicalRow, { onConflict: "patient_id" });
    if (mhErr) return NextResponse.json({ error: mhErr.message }, { status: 500 });

    const consentRow = {
      patient_id: patientId,
      consent_1: consent.consent_1,
      consent_2: consent.consent_2,
      consent_3: consent.consent_3,
      consent_4: consent.consent_4,
      consent_5: consent.consent_5,
      consent_6: consent.consent_6,
      consent_agreement: consent.consent_agreement,
      full_name: medicalValues.patient_name,
    };
    const { error: cErr } = await supabase.from("consent_records").upsert(consentRow, { onConflict: "patient_id" });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
