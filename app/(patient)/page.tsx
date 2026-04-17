"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocalState, setLocalState, type PatientLocalState } from "@/lib/onboarding";
import { Skeleton } from "@/components/ui/skeleton";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getLocalState();
    if (!existing) {
      try {
        const next: PatientLocalState = {
          patientId: generateSessionId(),
          intakeComplete: false,
          intakeStep: 1,
        };
        setLocalState(next);
        router.replace("/onboarding/medical-history");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start session");
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
  }, [router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-2/3" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
