"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatLongDateTimeInClinic } from "@/lib/time";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotIso: string | null;
  patientId: string;
  patientName: string;
  patientEmail: string;
  onBooked: (summary: { start: string; end: string | null; name: string; email: string }) => void;
  onSlotUnavailable?: () => void;
};

export function BookingConfirmModal({
  open,
  onOpenChange,
  slotIso,
  patientId,
  patientName,
  patientEmail,
  onBooked,
  onSlotUnavailable,
}: Props) {
  const [token] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (!slotIso) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/cal/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotTime: slotIso,
          recaptchaToken: token,
          patientId,
          timeZone: "America/Denver",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawError = typeof data.error === "string" ? data.error : "Booking failed";
        const isUnavailable = /already has booking|not available|no longer available/i.test(rawError);
        if (isUnavailable) {
          toast.error("That time is no longer available. Please pick another slot.");
          onOpenChange(false);
          onSlotUnavailable?.();
        } else {
          toast.error(rawError);
        }
        return;
      }
      const b = data.booking as { start: string; end: string | null; name: string; email: string };
      onBooked(b);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const when = slotIso ? formatLongDateTimeInClinic(slotIso) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription>Finalize your selected televisit slot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))]/15 bg-[hsl(var(--surface-low))] p-4 text-sm">
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> {when}
          </p>
          <p className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" /> {patientName}
          </p>
          <p className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> {patientEmail}
          </p>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void confirm()}>
            {submitting ? "Booking…" : "Confirm bookings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
