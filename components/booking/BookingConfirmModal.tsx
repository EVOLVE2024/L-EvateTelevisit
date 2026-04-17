"use client";

import { useState } from "react";
// import { useRef } from "react";
// import ReCAPTCHA from "react-google-recaptcha";
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
import { format, parseISO } from "date-fns";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotIso: string | null;
  patientId: string;
  patientName: string;
  patientEmail: string;
  onBooked: (summary: { start: string; end: string | null; name: string; email: string }) => void;
};

export function BookingConfirmModal({
  open,
  onOpenChange,
  slotIso,
  patientId,
  patientName,
  patientEmail,
  onBooked,
}: Props) {
  const [token] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Human verification is temporarily disabled.
  // const recaptchaRef = useRef<ReCAPTCHA>(null);
  // const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  async function confirm() {
    if (!slotIso) return;
    // Human verification is temporarily disabled.
    // if (!token) {
    //   toast.error("Please complete reCAPTCHA");
    //   return;
    // }
    setSubmitting(true);
    try {
      const res = await fetch("/api/cal/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotTime: slotIso,
          recaptchaToken: token,
          patientId,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Booking failed");
        // Human verification is temporarily disabled.
        // recaptchaRef.current?.reset();
        // setToken(null);
        return;
      }
      const b = data.booking as { start: string; end: string | null; name: string; email: string };
      onBooked(b);
      onOpenChange(false);
      // Human verification is temporarily disabled.
      // recaptchaRef.current?.reset();
      // setToken(null);
    } finally {
      setSubmitting(false);
    }
  }

  const when = slotIso ? format(parseISO(slotIso), "PPpp") : "";

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
        {/* Human verification is temporarily disabled.
        {siteKey ? (
          <div className="flex justify-center py-2">
            <ReCAPTCHA ref={recaptchaRef} sitekey={siteKey} onChange={(t) => setToken(t)} />
          </div>
        ) : (
          <p className="text-sm text-destructive">reCAPTCHA is not configured.</p>
        )} */}
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void confirm()}>
            {submitting ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
