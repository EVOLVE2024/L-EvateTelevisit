"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLongDateTimeInClinic } from "@/lib/time";

type Summary = { start: string; end: string | null; name: string; email: string };

export default function ConfirmationPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("levate_last_booking");
    if (!raw) {
      router.replace("/book");
      return;
    }
    try {
      setSummary(JSON.parse(raw) as Summary);
    } catch {
      router.replace("/book");
    }
  }, [router]);

  if (!summary) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card className="border-[hsl(var(--border))]/10 shadow-ambient">
        <CardHeader>
          <CardTitle>Booking confirmed</CardTitle>
          <CardDescription>We will follow up with details if needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">When:</span> {formatLongDateTimeInClinic(summary.start)}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span> {summary.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {summary.email}
          </p>
        </CardContent>
      </Card>
      <Button asChild className="w-full">
        <Link href="/book">Book another appointment</Link>
      </Button>
    </div>
  );
}
