"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLocalState, setLocalState, type PatientLocalState } from "@/lib/onboarding";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const existing = getLocalState();
      if (!existing) {
        try {
          const supabase = createClient();
          const { data, error: insertError } = await supabase.from("patients").insert({}).select("id").single();
          if (insertError || !data) {
            setError(insertError?.message ?? "Could not start session");
            return;
          }
          const next: PatientLocalState = {
            patientId: data.id,
            intakeComplete: false,
            intakeStep: 1,
          };
          setLocalState(next);
          if (!cancelled) router.replace("/onboarding/medical-history");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Configuration error");
        }
        return;
      }
      if (existing.intakeComplete) {
        router.replace("/book");
        return;
      }
      if (existing.intakeStep === 2) {
        router.replace("/onboarding/consent");
        return;
      }
      router.replace("/onboarding/medical-history");
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
