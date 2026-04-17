import type { MedicalHistoryFormValues } from "@/lib/schemas/medicalHistory";

const STORAGE_KEY = "levate_patient";

export interface PatientLocalState {
  patientId: string;
  /** Cached for instant greeting while summary loads. */
  patientName?: string;
  /** True only after medical history and consent are persisted. */
  intakeComplete: boolean;
  intakeStep: 1 | 2;
  /** Step 1 draft, kept locally until intake completes. */
  medicalHistoryDraft?: MedicalHistoryFormValues;
}

function migrateLegacy(raw: Record<string, unknown>): PatientLocalState | null {
  if (typeof raw.patientId !== "string") return null;
  const patientId = raw.patientId;

  if (typeof raw.intakeComplete === "boolean") {
    return {
      patientId,
      patientName: typeof raw.patientName === "string" ? raw.patientName : undefined,
      intakeComplete: raw.intakeComplete,
      intakeStep: raw.intakeStep === 2 ? 2 : 1,
      medicalHistoryDraft: raw.medicalHistoryDraft as MedicalHistoryFormValues | undefined,
    };
  }

  const onboardingComplete = Boolean(raw.onboardingComplete);
  const medicalHistoryDone = Boolean(raw.medicalHistoryDone);
  const consentDone = Boolean(raw.consentDone);
  const intakeComplete = onboardingComplete || (medicalHistoryDone && consentDone);

  if (intakeComplete) {
    return { patientId, patientName: typeof raw.patientName === "string" ? raw.patientName : undefined, intakeComplete: true, intakeStep: 1 };
  }
  if (medicalHistoryDone && !consentDone) {
    return {
      patientId,
      patientName: typeof raw.patientName === "string" ? raw.patientName : undefined,
      intakeComplete: false,
      intakeStep: 2,
    };
  }
  return {
    patientId,
    patientName: typeof raw.patientName === "string" ? raw.patientName : undefined,
    intakeComplete: false,
    intakeStep: 1,
  };
}

export function getLocalState(): PatientLocalState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return migrateLegacy(parsed);
  } catch {
    return null;
  }
}

export function setLocalState(state: PatientLocalState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
