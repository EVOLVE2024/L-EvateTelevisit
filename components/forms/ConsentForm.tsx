"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { getLocalState, setLocalState } from "@/lib/onboarding";
import { consentSchema, type ConsentFormValues } from "@/lib/schemas/consent";
import type { MedicalHistoryFormValues } from "@/lib/schemas/medicalHistory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ConsentItem = {
  key:
    | "consent_1"
    | "consent_2"
    | "consent_3"
    | "consent_4"
    | "consent_5"
    | "consent_6"
    | "consent_agreement";
  text: ReactNode;
};

const consentFields: ConsentItem[] = [
  {
    key: "consent_1",
    text: "I understand that the proposed treatment has been explained to me, including its goals and expected outcomes.",
  },
  {
    key: "consent_2",
    text: "I understand that results may vary between individuals and are not guaranteed.",
  },
  {
    key: "consent_3",
    text: "I understand that ongoing evaluation or follow-up may be necessary to achieve optimal results.",
  },
  {
    key: "consent_4",
    text: "I have been informed of possible side effects and complications that may occur during or after the treatment.",
  },
  {
    key: "consent_5",
    text: "I understand that it is my responsibility to follow post-treatment care instructions provided by my practitioner.",
  },
  {
    key: "consent_6",
    text: "I voluntarily consent to proceed with the proposed treatment.",
  },
  {
    key: "consent_agreement",
    text: (
      <>
        I have read and agree to the{" "}
        <Link
          href="/consent-forms"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Client Agreement Form
        </Link>
        .
      </>
    ),
  },
];

export function ConsentForm() {
  const router = useRouter();
  const [serverMedical, setServerMedical] = useState<MedicalHistoryFormValues | null | undefined>(undefined);
  const submittedRef = useRef(false);

  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      consent_1: false,
      consent_2: false,
      consent_3: false,
      consent_4: false,
      consent_5: false,
      consent_6: false,
      consent_agreement: false,
    },
  });

  const allChecked = consentFields.every(({ key }) => form.watch(key));
  const ls = getLocalState();
  const hasMedicalDraft = Boolean(ls?.medicalHistoryDraft);
  const medicalDataPending = !hasMedicalDraft && serverMedical === undefined;
  const medicalDataMissing = !hasMedicalDraft && serverMedical === null;

  useEffect(() => {
    const s = getLocalState();
    if (!s?.patientId || s.medicalHistoryDraft || s.intakeStep !== 2) {
      setServerMedical(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/patient/medical-history?patientId=${encodeURIComponent(s.patientId)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ medicalHistory: MedicalHistoryFormValues | null }>;
      })
      .then((j) => {
        if (!cancelled) setServerMedical(j?.medicalHistory ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (submittedRef.current) return;
    if (medicalDataMissing) {
      toast.error("Please complete medical history first.");
      router.replace("/onboarding/medical-history");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react once when detection completes
  }, [medicalDataMissing]);

  async function onSubmit(values: ConsentFormValues) {
    const state = getLocalState();
    if (!state?.patientId) {
      toast.error("Session missing.");
      router.replace("/");
      return;
    }
    const medical = state.medicalHistoryDraft ?? serverMedical;
    if (!medical) {
      toast.error("Complete medical history first.");
      router.replace("/onboarding/medical-history");
      return;
    }
    const res = await fetch("/api/patient/intake/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: state.patientId,
        medicalHistory: medical,
        consent: values,
      }),
    });
    let data: { error?: string; code?: string } = {};
    try {
      data = (await res.json()) as { error?: string; code?: string };
    } catch {
      data = {};
    }
    if (!res.ok) {
      if (res.status === 409 && data.code === "duplicate_patient") {
        toast.error(
          data.error ?? "This name and email combination is already registered. Please update your medical history."
        );
        router.replace("/onboarding/medical-history");
        return;
      }
      toast.error(data.error ?? "Could not save intake");
      return;
    }
    submittedRef.current = true;
    setLocalState({
      patientId: state.patientId,
      patientName: state.patientName ?? medical.patient_name,
      intakeComplete: true,
      intakeStep: 1,
    });
    toast.success("Intake complete");
    router.push("/book");
  }

  function goBackToMedicalHistory() {
    const s = getLocalState();
    if (!s?.patientId) {
      router.replace("/");
      return;
    }
    setLocalState({
      patientId: s.patientId,
      patientName: s.patientName ?? s.medicalHistoryDraft?.patient_name ?? (serverMedical?.patient_name ?? undefined),
      intakeComplete: false,
      intakeStep: 1,
      medicalHistoryDraft: s.medicalHistoryDraft ?? (serverMedical ?? undefined),
    });
    router.push("/onboarding/medical-history");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <form onSubmit={form.handleSubmit(onSubmit)} className="intake-form space-y-6">
        <Card className="border-[hsl(var(--border))]/30 bg-white/85 shadow-ambient backdrop-blur">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">Declarations</h2>
                <p className="text-sm text-muted-foreground">Please read and acknowledge each statement below to continue.</p>
              </div>
            </div>

            <div className="space-y-3">
              {consentFields.map(({ key, text }) => (
                <label
                  key={key}
                  htmlFor={`consent-${key}`}
                  className={cn(
                    "flex cursor-pointer select-none items-start gap-3 rounded-2xl border p-4 transition-colors",
                    "hover:border-primary/40 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15",
                    form.watch(key)
                      ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
                      : "border-[hsl(var(--border))]/30 bg-[hsl(var(--surface-low))]"
                  )}
                >
                  <Controller
                    control={form.control}
                    name={key}
                    render={({ field }) => (
                      <Checkbox
                        id={`consent-${key}`}
                        checked={field.value as boolean}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        className="mt-0.5"
                      />
                    )}
                  />
                  <p className="text-sm leading-relaxed text-[hsl(var(--foreground))]">{text}</p>
                </label>
              ))}
            </div>

            {form.formState.errors.consent_1 && (
              <p className="inline-flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> All declarations are required.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={goBackToMedicalHistory}
              disabled={form.formState.isSubmitting}
            >
              Back to medical history
            </Button>
            {medicalDataMissing ? (
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to medical history…
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || !allChecked || medicalDataPending || medicalDataMissing}
            >
              {form.formState.isSubmitting ? "Saving…" : medicalDataPending ? "Loading…" : "Confirm & sign intake"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-4">
        <Card className="border-[hsl(var(--border))]/30 bg-gradient-to-br from-primary to-primary-dim text-primary-foreground shadow-ambient">
          <CardContent className="space-y-3 p-6">
            <h3 className="font-display text-lg font-semibold">Patient Security</h3>
            <p className="text-sm text-primary-foreground/90">
              Your consent is vital to our ethical standards. All treatments are conducted under strict clinical
              guidelines for your safety.
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-primary-foreground/90">
              <CheckCircle2 className="h-3.5 w-3.5" /> All items required to proceed
            </p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))]/30 bg-white/85 shadow-sm">
          <CardContent className="space-y-3 p-6">
            <h3 className="inline-flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-primary" /> Need Help?
            </h3>
            <p className="text-sm text-muted-foreground">
              If any part of this form is unclear, please request a call with your specialist before checking the boxes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
