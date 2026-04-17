"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, ClipboardPlus, Contact, HeartPulse, ShieldPlus } from "lucide-react";
import { getLocalState, setLocalState } from "@/lib/onboarding";
import { medicalHistoryFormSchema, type MedicalHistoryFormValues } from "@/lib/schemas/medicalHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function YesNo({
  value,
  onChange,
}: {
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "h-10 rounded-xl border text-sm font-semibold transition-colors",
            value === v
              ? "border-primary bg-primary text-primary-foreground"
              : "border-[hsl(var(--border))]/20 bg-[hsl(var(--surface-low))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-high))]"
          )}
        >
          {v === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function MedicalHistoryForm() {
  const router = useRouter();
  const form = useForm<MedicalHistoryFormValues>({
    resolver: zodResolver(medicalHistoryFormSchema),
    defaultValues: {
      patient_name: "",
      date_of_birth: "",
      address: "",
      cell_number: "",
      email: "",
      sex: "Male",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      reason_for_visit: "",
      last_physical_exam: "",
      primary_physician: "",
      general_health_good: "yes",
      general_health_notes: "",
      smokes: "no",
      smoke_per_day: "",
      smoke_years: "",
      drinks_alcohol: "no",
      alcohol_details: "",
      tanning_bed: "no",
      takes_vitamins: "no",
      treatments_interested: "",
    },
  });

  const watchGeneral = form.watch("general_health_good");
  const watchSmokes = form.watch("smokes");
  const watchDrinks = form.watch("drinks_alcohol");

  useEffect(() => {
    const draft = getLocalState()?.medicalHistoryDraft;
    if (draft) {
      form.reset({
        ...draft,
        sex:
          draft.sex === "Male" || draft.sex === "Female" || draft.sex === "Other"
            ? draft.sex
            : "Other",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, []);

  async function onSubmit(values: MedicalHistoryFormValues) {
    const state = getLocalState();
    if (!state?.patientId) {
      toast.error("Session missing. Please start again.");
      router.replace("/");
      return;
    }

    try {
      const res = await fetch("/api/patient/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.patient_name,
          email: values.email,
          patientId: state.patientId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { duplicate?: boolean };
        if (data.duplicate) {
          form.setError("email", {
            type: "duplicate",
            message: "A patient with this name and email combination already exists.",
          });
          toast.error("This name and email combination is already registered.");
          return;
        }
      }
    } catch {
      // Non-fatal: server-side enforcement in /api/patient/intake/complete still guards the DB.
    }

    setLocalState({
      patientId: state.patientId,
      patientName: values.patient_name,
      intakeComplete: false,
      intakeStep: 2,
      medicalHistoryDraft: values,
    });
    router.push("/onboarding/consent");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="intake-form space-y-6">
      <Card className="border-[hsl(var(--border))]/30 bg-white/80 shadow-ambient backdrop-blur">
        <CardContent className="p-6">
          <SectionHeader
            icon={<ClipboardPlus className="h-5 w-5" />}
            title="Personal Details"
            description="Foundational information for your electronic health record."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="patient_name">Patient Name</Label>
              <Input id="patient_name" {...form.register("patient_name")} />
              {form.formState.errors.patient_name && (
                <p className="text-sm text-destructive">{form.formState.errors.patient_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" type="date" {...form.register("date_of_birth")} />
              {form.formState.errors.date_of_birth && (
                <p className="text-sm text-destructive">{form.formState.errors.date_of_birth.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Controller
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" rows={2} {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cell_number">Cell number</Label>
              <Input id="cell_number" type="tel" {...form.register("cell_number")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border))]/30 bg-white/80 shadow-ambient backdrop-blur">
        <CardContent className="p-6">
          <SectionHeader
            icon={<Contact className="h-5 w-5" />}
            title="Support Circle"
            description="Emergency contacts and current medical provider network."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Emergency contact</Label>
              <Input id="emergency_contact_name" placeholder="Full Name" {...form.register("emergency_contact_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Contact phone</Label>
              <Input id="emergency_contact_phone" type="tel" {...form.register("emergency_contact_phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_physician">Primary physician</Label>
              <Input id="primary_physician" {...form.register("primary_physician")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_physical_exam">Last physical exam</Label>
              <Input id="last_physical_exam" type="date" {...form.register("last_physical_exam")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border))]/30 bg-white/80 shadow-ambient backdrop-blur">
        <CardContent className="p-6">
          <SectionHeader
            icon={<HeartPulse className="h-5 w-5" />}
            title="Visit Reason & Lifestyle"
            description="Daily habits and environmental factors that impact your wellbeing."
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason_for_visit">Reason for your visit today?</Label>
              <Textarea id="reason_for_visit" rows={3} {...form.register("reason_for_visit")} />
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--surface-low))]/80 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Is your general health good?</Label>
                  <Controller
                    control={form.control}
                    name="general_health_good"
                    render={({ field }) => <YesNo value={field.value} onChange={field.onChange} />}
                  />
                </div>
                {watchGeneral === "no" && (
                  <div className="space-y-2">
                    <Label htmlFor="general_health_notes">Please explain</Label>
                    <Textarea id="general_health_notes" rows={2} {...form.register("general_health_notes")} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Do you smoke?</Label>
                  <Controller
                    control={form.control}
                    name="smokes"
                    render={({ field }) => <YesNo value={field.value} onChange={field.onChange} />}
                  />
                </div>
                {watchSmokes === "yes" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smoke_per_day">How many per day?</Label>
                      <Input id="smoke_per_day" {...form.register("smoke_per_day")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smoke_years">For how many years?</Label>
                      <Input id="smoke_years" {...form.register("smoke_years")} />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Do you drink alcohol?</Label>
                  <Controller
                    control={form.control}
                    name="drinks_alcohol"
                    render={({ field }) => <YesNo value={field.value} onChange={field.onChange} />}
                  />
                </div>
                {watchDrinks === "yes" && (
                  <div className="space-y-2">
                    <Label htmlFor="alcohol_details">How much and how often?</Label>
                    <Textarea id="alcohol_details" rows={2} {...form.register("alcohol_details")} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Tanning or sun exposure?</Label>
                  <Controller
                    control={form.control}
                    name="tanning_bed"
                    render={({ field }) => <YesNo value={field.value} onChange={field.onChange} />}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Do you regularly take vitamins?</Label>
                  <Controller
                    control={form.control}
                    name="takes_vitamins"
                    render={({ field }) => <YesNo value={field.value} onChange={field.onChange} />}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatments_interested">Treatments or products that interest you</Label>
              <Textarea id="treatments_interested" rows={3} {...form.register("treatments_interested")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--border))]/10 bg-gradient-to-br from-primary to-primary-dim text-primary-foreground shadow-ambient">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Clinical intake protection
            </div>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/90">
              By continuing, you confirm this information is accurate to the best of your knowledge. It is stored with
              your intake until you sign consent on the next step.
            </p>
          </div>
          <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Continue to consent"}
          </Button>
        </CardContent>
      </Card>

      <div className="hidden text-xs text-muted-foreground sm:flex sm:items-center sm:gap-2">
        <ShieldPlus className="h-3.5 w-3.5" /> Data is encrypted and stored securely.
      </div>
    </form>
  );
}
