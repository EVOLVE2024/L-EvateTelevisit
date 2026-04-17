"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getLocalState } from "@/lib/onboarding";
import { MedicalHistoryForm } from "@/components/forms/MedicalHistoryForm";

export default function MedicalHistoryPage() {
  const router = useRouter();
  useEffect(() => {
    const s = getLocalState();
    if (!s) {
      router.replace("/");
      return;
    }
    if (s.intakeComplete) {
      router.replace("/book");
    }
  }, [router]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-ambient">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary">
          <ClipboardList className="h-3.5 w-3.5" /> Step 1 of 2
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Patient Medical History</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Foundational information for your electronic health record and clinical intake.
        </p>
      </section>
      <MedicalHistoryForm />
    </div>
  );
}
