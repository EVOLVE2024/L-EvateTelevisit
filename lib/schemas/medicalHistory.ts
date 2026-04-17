import { z } from "zod";

export const medicalHistorySchema = z.object({
  patient_name: z.string().min(1, "Required"),
  date_of_birth: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  cell_number: z.string().min(1, "Required"),
  email: z.string().email(),
  sex: z.enum(["Male", "Female", "Other"]),
  emergency_contact_name: z.string().min(1, "Required"),
  emergency_contact_phone: z.string().min(1, "Required"),
  reason_for_visit: z.string().min(1, "Required"),
  last_physical_exam: z.string().optional(),
  primary_physician: z.string().optional(),
  general_health_good: z.enum(["yes", "no"]),
  general_health_notes: z.string().optional(),
  smokes: z.enum(["yes", "no"]),
  smoke_per_day: z.string().optional(),
  smoke_years: z.string().optional(),
  drinks_alcohol: z.enum(["yes", "no"]),
  alcohol_details: z.string().optional(),
  tanning_bed: z.enum(["yes", "no"]),
  takes_vitamins: z.enum(["yes", "no"]),
  treatments_interested: z.string().optional(),
});

export const medicalHistoryFormSchema = medicalHistorySchema.superRefine((data, ctx) => {
  if (data.general_health_good === "no" && !data.general_health_notes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["general_health_notes"],
      message: "Please explain",
    });
  }
  if (data.smokes === "yes") {
    if (!data.smoke_per_day?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smoke_per_day"],
        message: "Required",
      });
    }
    if (!data.smoke_years?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smoke_years"],
        message: "Required",
      });
    }
  }
  if (data.drinks_alcohol === "yes" && !data.alcohol_details?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["alcohol_details"],
      message: "Please describe amount and frequency",
    });
  }
});

export type MedicalHistoryFormValues = z.infer<typeof medicalHistoryFormSchema>;
