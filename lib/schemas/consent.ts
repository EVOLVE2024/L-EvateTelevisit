import { z } from "zod";

export const consentSchema = z.object({
  consent_1: z.boolean().refine((v) => v, "Required"),
  consent_2: z.boolean().refine((v) => v, "Required"),
  consent_3: z.boolean().refine((v) => v, "Required"),
  consent_4: z.boolean().refine((v) => v, "Required"),
  consent_5: z.boolean().refine((v) => v, "Required"),
  consent_6: z.boolean().refine((v) => v, "Required"),
  consent_agreement: z.boolean().refine((v) => v, "Required"),
});

export type ConsentFormValues = z.infer<typeof consentSchema>;
