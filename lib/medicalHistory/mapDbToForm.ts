import type { MedicalHistoryFormValues } from "@/lib/schemas/medicalHistory";

/** Maps a medical_history DB row to react-hook-form values. */
export function medicalHistoryRowToFormValues(row: {
  patient_name: string;
  date_of_birth: string;
  address: string;
  cell_number: string;
  email: string;
  sex: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  reason_for_visit: string;
  last_physical_exam: string | null;
  primary_physician: string | null;
  general_health_good: boolean;
  general_health_notes: string | null;
  smokes: boolean | null;
  smoke_per_day: string | null;
  smoke_years: string | null;
  drinks_alcohol: boolean | null;
  alcohol_details: string | null;
  tanning_bed: boolean | null;
  takes_vitamins: boolean | null;
  treatments_interested: string | null;
}): MedicalHistoryFormValues {
  return {
    patient_name: row.patient_name,
    date_of_birth: row.date_of_birth?.slice(0, 10) ?? "",
    address: row.address,
    cell_number: row.cell_number,
    email: row.email,
    sex: row.sex === "Male" || row.sex === "Female" || row.sex === "Other" ? row.sex : "Other",
    emergency_contact_name: row.emergency_contact_name,
    emergency_contact_phone: row.emergency_contact_phone,
    reason_for_visit: row.reason_for_visit,
    last_physical_exam: row.last_physical_exam?.slice(0, 10) ?? "",
    primary_physician: row.primary_physician ?? "",
    general_health_good: row.general_health_good ? "yes" : "no",
    general_health_notes: row.general_health_notes ?? "",
    smokes: row.smokes ? "yes" : "no",
    smoke_per_day: row.smoke_per_day ?? "",
    smoke_years: row.smoke_years ?? "",
    drinks_alcohol: row.drinks_alcohol ? "yes" : "no",
    alcohol_details: row.alcohol_details ?? "",
    tanning_bed: row.tanning_bed ? "yes" : "no",
    takes_vitamins: row.takes_vitamins ? "yes" : "no",
    treatments_interested: row.treatments_interested ?? "",
  };
}
