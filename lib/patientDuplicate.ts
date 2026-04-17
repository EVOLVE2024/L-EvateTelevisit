import type { SupabaseClient } from "@supabase/supabase-js";

export type DuplicateCheckResult = {
  duplicate: boolean;
  matchedPatientId: string | null;
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Rejects only when BOTH name and email match an existing patient.
 * Case-insensitive, whitespace-trimmed.
 */
export async function findDuplicatePatient(
  supabase: SupabaseClient,
  params: { name: string; email: string; excludePatientId?: string }
): Promise<DuplicateCheckResult> {
  const name = normalize(params.name);
  const email = normalize(params.email);
  if (!name || !email) return { duplicate: false, matchedPatientId: null };

  const { data, error } = await supabase
    .from("medical_history")
    .select("patient_id, patient_name, email")
    .ilike("patient_name", name)
    .ilike("email", email)
    .limit(5);

  if (error || !data) return { duplicate: false, matchedPatientId: null };

  for (const row of data) {
    const rowName = normalize(String(row.patient_name ?? ""));
    const rowEmail = normalize(String(row.email ?? ""));
    if (rowName !== name || rowEmail !== email) continue;
    if (params.excludePatientId && row.patient_id === params.excludePatientId) continue;
    return { duplicate: true, matchedPatientId: String(row.patient_id) };
  }
  return { duplicate: false, matchedPatientId: null };
}
