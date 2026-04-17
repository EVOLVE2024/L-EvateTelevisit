"use client";

import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/patient/SiteFooter";
import { SiteHeader } from "@/components/patient/SiteHeader";
export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--surface))]">
      <SiteHeader />
      <main className={cn("flex-1", "relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6")}>{children}</main>
      <SiteFooter />
    </div>
  );
}
