export const CLINIC_TIMEZONE = "America/Denver";
export const CLINIC_TIMEZONE_LABEL = "Mountain Time";
export const CLINIC_TIMEZONE_ABBR = "MT";

function toDate(iso: string | Date): Date {
  return typeof iso === "string" ? new Date(iso) : iso;
}

function partsFor(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TIMEZONE, ...options });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Time only, e.g. "9:00 AM" */
export function formatTimeInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(iso));
}

/** Day name + date + time, e.g. "Monday, Apr 27 at 9:00 AM" */
export function formatDateTimeInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(iso));
}

/** Full date + time suffixed with " (MT)", e.g. "April 27, 2026 at 9:00 AM (MT)" */
export function formatLongDateTimeInClinic(iso: string | Date): string {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(toDate(iso))} (${CLINIC_TIMEZONE_ABBR})`;
}

/** Short date only, e.g. "Apr 27, 2026" */
export function formatDateInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(iso));
}

/** Medium date-time: "Apr 27, 2026, 9:00 AM" */
export function formatMediumDateTimeInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(iso));
}

/** Just the 3-letter month, e.g. "Apr" */
export function formatMonthShortInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TIMEZONE, month: "short" }).format(
    toDate(iso)
  );
}

/** Day of month number, e.g. "27" */
export function formatDayOfMonthInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TIMEZONE, day: "numeric" }).format(
    toDate(iso)
  );
}

/** Stable yyyy-MM-dd date key in Denver zone for grouping/matching calendar days. */
export function clinicDateKey(iso: string | Date): string {
  const p = partsFor(toDate(iso), { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hour of day 0-23 in the clinic zone. */
export function clinicHour(iso: string | Date): number {
  const raw = partsFor(toDate(iso), { hour: "numeric", hour12: false }).hour ?? "0";
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
