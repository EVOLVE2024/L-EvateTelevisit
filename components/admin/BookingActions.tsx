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

/** Booking status actions for pending/confirmed bookings. */
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
  const [busy, setBusy] = useState<"confirm" | "decline" | "cancel" | null>(null);
  const normalizedStatus = status.toLowerCase();
  const isPending = normalizedStatus === "pending";
  const isConfirmed = normalizedStatus === "confirmed";

  if (!uid) return null;
  if (!isPending && !isConfirmed) return null;

  async function run(action: "confirm" | "decline" | "cancel") {
    if (!uid) return;
    let reason = "";
    if (action === "decline" || action === "cancel") {
      const promptLabel =
        action === "decline"
          ? "Reason for declining (shown to the patient):"
          : "Reason for cancelling confirmed appointment (shown to the patient):";
      const prompted = window.prompt(promptLabel, "");
      if (prompted === null) return;
      reason = prompted;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(uid)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "decline" || action === "cancel" ? JSON.stringify({ reason }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not update booking");
        return;
      }
      toast.success(
        action === "confirm"
          ? "Booking confirmed"
          : action === "decline"
            ? "Booking declined"
            : "Booking cancelled"
      );
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
      {isPending && (
        <>
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
        </>
      )}
      {isConfirmed && (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={busy !== null}
          onClick={() => void run("cancel")}
          className="gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          {busy === "cancel" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Cancel
        </Button>
      )}
    </div>
  );
}
