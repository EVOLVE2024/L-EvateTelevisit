export type BookingStatus = "pending" | "rescheduled" | "confirmed" | "cancelled";

// Monotonic rank: later events with a higher rank are allowed to overwrite
// earlier ones. `cancelled` is terminal and always wins.
const STATUS_RANK: Record<BookingStatus, number> = {
  pending: 0,
  rescheduled: 1,
  confirmed: 2,
  cancelled: 3,
};

export function normalizeStatus(raw: string | null | undefined): BookingStatus {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (v === "confirmed" || v === "accepted") return "confirmed";
  if (v === "cancelled" || v === "canceled" || v === "rejected") return "cancelled";
  if (v === "rescheduled") return "rescheduled";
  return "pending";
}

export function statusFromCalTrigger(trigger: string | null | undefined): BookingStatus {
  switch ((trigger ?? "").toString()) {
    case "BOOKING_CONFIRMED":
      return "confirmed";
    case "BOOKING_CANCELLED":
    case "BOOKING_REJECTED":
      return "cancelled";
    case "BOOKING_RESCHEDULED":
      return "rescheduled";
    case "BOOKING_CREATED":
    default:
      return "pending";
  }
}

// Cal.com v2 `GET /v2/bookings/{uid}` returns a `status` field. Map it to
// our local status vocabulary.
export function statusFromCalRemote(raw: string | null | undefined): BookingStatus {
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (v === "accepted") return "confirmed";
  if (v === "rejected" || v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "rescheduled") return "rescheduled";
  return "pending";
}

/**
 * Decide whether to apply a status update. Cancellations always win;
 * otherwise only moves with equal-or-higher rank are allowed. This
 * protects against webhook replays/out-of-order delivery downgrading
 * a `confirmed` row back to `pending`.
 */
export function shouldApplyStatus(
  current: BookingStatus | string | null | undefined,
  next: BookingStatus
): boolean {
  if (next === "cancelled") return true;
  const currentRank = STATUS_RANK[normalizeStatus(current)] ?? 0;
  const nextRank = STATUS_RANK[next];
  return nextRank >= currentRank;
}
