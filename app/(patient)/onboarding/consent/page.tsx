"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getLocalState } from "@/lib/onboarding";
import { ConsentForm } from "@/components/forms/ConsentForm";

export default function ConsentPage() {
  const router = useRouter();
  useEffect(() => {
    const s = getLocalState();
    if (!s) {
      router.replace("/");
      return;
    }
    if (s.intakeComplete) {
      router.replace("/book");
      return;
    }
    if (s.intakeStep !== 2) {
      router.replace("/onboarding/medical-history");
    }
  }, [router]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-white p-6 shadow-ambient">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Step 2 of 2
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Pre-treatment Consent</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Your consent confirms understanding of clinical guidance, outcomes, and post-treatment responsibilities.
        </p>
      </section>
      <ConsentForm />
    </div>
  );
}
