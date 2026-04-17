"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Size = "sm" | "default";

export type BookingActionResult = {
  newStatus: "confirmed" | "cancelled";
};

/** Confirm/Decline buttons; renders only for `pending` bookings. */
export function BookingActions({
  uid,
  status,
  size = "sm",
  className,
  onCompleted,
}: {
  uid: string | null;
  status: string;
  size?: Size;
  className?: string;
  onCompleted?: (r: BookingActionResult) => void;
}) {
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const isPending = status === "pending";

  if (!uid) return null;
  if (!isPending) return null;

  async function run(action: "confirm" | "decline") {
    if (!uid) return;
    let reason = "";
    if (action === "decline") {
      reason = window.prompt("Reason for declining (shown to the patient):", "") ?? "";
      if (reason === null) return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(uid)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "decline" ? JSON.stringify({ reason }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update booking");
        return;
      }
      toast.success(action === "confirm" ? "Booking confirmed" : "Booking declined");
      onCompleted?.({ newStatus: action === "confirm" ? "confirmed" : "cancelled" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="default"
        size={size}
        disabled={busy !== null}
        onClick={() => void run("confirm")}
        className="gap-1"
      >
        {busy === "confirm" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Confirm
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={busy !== null}
        onClick={() => void run("decline")}
        className="gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
      >
        {busy === "decline" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        Decline
      </Button>
    </div>
  );
}
