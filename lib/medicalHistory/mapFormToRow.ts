import type { MedicalHistoryFormValues } from "@/lib/schemas/medicalHistory";

export function medicalHistoryFormToDbRow(patientId: string, values: MedicalHistoryFormValues) {
  return {
    patient_id: patientId,
    patient_name: values.patient_name,
    clinic_name: values.clinic_name,
    date_of_birth: values.date_of_birth,
    address: values.address,
    cell_number: values.cell_number,
    email: values.email,
    sex: values.sex,
    emergency_contact_name: values.emergency_contact_name,
    emergency_contact_phone: values.emergency_contact_phone,
    reason_for_visit: values.reason_for_visit,
    last_physical_exam: values.last_physical_exam?.trim() ? values.last_physical_exam : null,
    primary_physician: values.primary_physician?.trim() ? values.primary_physician : null,
    general_health_good: values.general_health_good === "yes",
    general_health_notes: values.general_health_notes?.trim() ? values.general_health_notes : null,
    smokes: values.smokes === "yes",
    smoke_per_day: values.smoke_per_day?.trim() ? values.smoke_per_day : null,
    smoke_years: values.smoke_years?.trim() ? values.smoke_years : null,
    drinks_alcohol: values.drinks_alcohol === "yes",
    alcohol_details: values.alcohol_details?.trim() ? values.alcohol_details : null,
    tanning_bed: values.tanning_bed === "yes",
    takes_vitamins: values.takes_vitamins === "yes",
    treatments_interested: values.treatments_interested?.trim() ? values.treatments_interested : null,
  };
}
