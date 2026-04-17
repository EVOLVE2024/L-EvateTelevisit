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

/** "9:00 AM" */
export function formatTimeInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(iso));
}

/** "Monday, Apr 27 at 9:00 AM" */
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

/** "April 27, 2026 at 9:00 AM (MT)" */
export function formatLongDateTimeInClinic(iso: string | Date): string {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(toDate(iso))} (${CLINIC_TIMEZONE_ABBR})`;
}

/** "Apr 27, 2026" */
export function formatDateInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(iso));
}

/** "Apr 27, 2026, 9:00 AM" */
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

/** "Apr" */
export function formatMonthShortInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TIMEZONE, month: "short" }).format(
    toDate(iso)
  );
}

/** "27" */
export function formatDayOfMonthInClinic(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TIMEZONE, day: "numeric" }).format(
    toDate(iso)
  );
}

/** yyyy-MM-dd in clinic zone, used as stable day key. */
export function clinicDateKey(iso: string | Date): string {
  const p = partsFor(toDate(iso), { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hour 0-23 in clinic zone. */
export function clinicHour(iso: string | Date): number {
  const raw = partsFor(toDate(iso), { hour: "numeric", hour12: false }).hour ?? "0";
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return n === 24 ? 0 : n;
}

/** Minute 0-59 in clinic zone. */
export function clinicMinute(iso: string | Date): number {
  const raw = partsFor(toDate(iso), { minute: "numeric" }).minute ?? "0";
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Signed GMT offset hours for Denver (e.g. -6 MDT, -7 MST). */
export function clinicGmtOffset(iso: string | Date = new Date()): number {
  const d = toDate(iso);
  const p = partsFor(d, { hour: "numeric", hour12: false });
  const denverHour = Number(p.hour ?? "0");
  const utcHour = d.getUTCHours();
  const utcMinute = d.getUTCMinutes();
  const denverMinute = Number(partsFor(d, { minute: "numeric" }).minute ?? "0");
  let diffMinutes = (denverHour * 60 + denverMinute) - (utcHour * 60 + utcMinute);
  if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;
  if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;
  return Math.round(diffMinutes / 60);
}

const CLINIC_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** yyyy-MM-dd key of the week-start day in clinic zone (DST-safe). */
export function clinicWeekStartKey(iso: string | Date, weekStartsOn: 0 | 1 = 0): string {
  const d = toDate(iso);
  const key = clinicDateKey(d);
  const weekday = partsFor(d, { weekday: "short" }).weekday ?? "Sun";
  const idx = CLINIC_WEEKDAYS.indexOf(weekday as (typeof CLINIC_WEEKDAYS)[number]);
  const back = idx < 0 ? 0 : (idx - weekStartsOn + 7) % 7;
  return addDaysToKey(key, -back);
}

/** Shift a yyyy-MM-dd key by `delta` days. */
export function addDaysToKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Parse "yyyy-MM-dd" into a local-midnight Date (display only). */
export function parseKeyAsLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
