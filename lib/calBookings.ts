import https from "node:https";

// Normalized shape the admin UI consumes; isolates Cal.com wire format.
export type CalBookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "completed"
  | "unknown";

export type CalAttendee = {
  name: string | null;
  email: string | null;
  timeZone: string | null;
};

export type CalBooking = {
  id: number | string | null;
  uid: string | null;
  title: string | null;
  status: CalBookingStatus;
  start: string;
  end: string;
  duration: number | null;
  meetingUrl: string | null;
  rescheduleUrl: string | null;
  location: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  cancellationReason: string | null;
  rescheduledByEmail: string | null;
  eventTypeId: number | null;
  hosts: Array<{ name: string | null; email: string | null; timeZone: string | null }>;
  attendees: CalAttendee[];
  supabasePatientId: string | null;
  raw: Record<string, unknown>;
};

/** Values accepted by Cal.com's list-endpoint `status` filter. */
export type CalListStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";

export type CalBookingListFilters = {
  afterStart?: string;
  beforeEnd?: string;
  afterCreatedAt?: string;
  beforeCreatedAt?: string;
  status?: CalListStatus | CalListStatus[];
  attendeeEmail?: string;
  attendeeName?: string;
  eventTypeIds?: number[];
  take?: number;
  skip?: number;
  sortStart?: "asc" | "desc";
  sortCreated?: "asc" | "desc";
};

export type CalBookingListResult = {
  bookings: CalBooking[];
  pagination: {
    totalItems: number | null;
    remainingItems: number | null;
    take: number;
    skip: number;
    hasMore: boolean;
  };
};

const CAL_API_BASE = "https://api.cal.com";
const CAL_BOOKER_BASE = process.env.CAL_BOOKER_BASE_URL?.trim() || "https://app.cal.com";
// Matches the `BookingOutput_2024_08_13` schema.
const CAL_API_VERSION = "2024-08-13";
const DEFAULT_TAKE = 100;

function calHeaders(): Record<string, string> | null {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": CAL_API_VERSION,
    "Content-Type": "application/json",
  };
}

// Short TTL in-memory cache to avoid Cal.com rate limits.
const CACHE_TTL_MS = 30_000;
type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttl = CACHE_TTL_MS): void {
  cache.set(key, { value, expires: Date.now() + ttl });
}

export function invalidateCalBookingsCache(): void {
  cache.clear();
}

async function fetchJsonOverIpv4(url: string, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: "GET", headers, agent: new https.Agent({ family: 4 }) },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status === 404) {
            resolve(null);
            return;
          }
          if (status < 200 || status >= 300) {
            reject(new Error(`Cal bookings error ${status}: ${body.slice(0, 400)}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            reject(new Error("Cal bookings returned invalid JSON"));
          }
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function calGet(url: string): Promise<unknown> {
  const headers = calHeaders();
  if (!headers) throw new Error("CAL_API_KEY is not set");
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      console.error(`[calBookings] ${res.status} on ${url}: ${text.slice(0, 500)}`);
      throw new Error(`Cal bookings error ${res.status}: ${text.slice(0, 400)}`);
    }
    return (await res.json()) as unknown;
  } catch (err) {
    // Retry over IPv4 only on network-level failures, not HTTP errors.
    if (err instanceof Error && err.message.startsWith("Cal bookings error")) {
      throw err;
    }
    return fetchJsonOverIpv4(url, headers);
  }
}

function normalizeStatus(raw: unknown): CalBookingStatus {
  const v = String(raw ?? "").toLowerCase();
  if (v === "accepted" || v === "confirmed") return "confirmed";
  if (v === "rejected" || v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "rescheduled") return "rescheduled";
  if (v === "completed") return "completed";
  if (v === "pending" || v === "awaiting_host" || v === "unconfirmed") return "pending";
  return "unknown";
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapBooking(raw: Record<string, unknown>): CalBooking {
  const fields = (raw.bookingFieldsResponses ?? {}) as Record<string, unknown>;
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
  const attendeesRaw = Array.isArray(raw.attendees) ? (raw.attendees as Record<string, unknown>[]) : [];
  const hostsRaw = Array.isArray(raw.hosts) ? (raw.hosts as Record<string, unknown>[]) : [];

  const bookingUid = str(raw.uid);
  const explicitRescheduleUrl =
    str(raw.rescheduleUrl) ??
    str(raw.reschedulingUrl) ??
    str(raw.rescheduleLink) ??
    str(raw.reschedulingLink);

  return {
    id: (raw.id as number | string | undefined) ?? null,
    uid: bookingUid,
    title: str(raw.title),
    status: normalizeStatus(raw.status),
    start: String(raw.start ?? raw.startTime ?? ""),
    end: String(raw.end ?? raw.endTime ?? ""),
    duration: num(raw.duration),
    meetingUrl: str(raw.meetingUrl),
    rescheduleUrl: explicitRescheduleUrl ?? (bookingUid ? `${CAL_BOOKER_BASE}/reschedule/${bookingUid}` : null),
    location: str(raw.location),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
    cancellationReason: str(raw.cancellationReason),
    rescheduledByEmail: str(raw.rescheduledByEmail),
    eventTypeId: num(raw.eventTypeId),
    hosts: hostsRaw.map((h) => ({
      name: str(h.name),
      email: str(h.email) ?? str(h.displayEmail),
      timeZone: str(h.timeZone),
    })),
    attendees: attendeesRaw.map((a) => ({
      name: str(a.name),
      email: str(a.email) ?? str(a.displayEmail),
      timeZone: str(a.timeZone),
    })),
    supabasePatientId: str(fields.supabase_id) ?? str(metadata.patient_id),
    raw,
  };
}

/** GET /v2/bookings with filters; results cached 30s per query. */
export async function listCalBookings(filters: CalBookingListFilters = {}): Promise<CalBookingListResult> {
  const url = new URL(`${CAL_API_BASE}/v2/bookings`);
  if (filters.afterStart) url.searchParams.set("afterStart", filters.afterStart);
  if (filters.beforeEnd) url.searchParams.set("beforeEnd", filters.beforeEnd);
  if (filters.afterCreatedAt) url.searchParams.set("afterCreatedAt", filters.afterCreatedAt);
  if (filters.beforeCreatedAt) url.searchParams.set("beforeCreatedAt", filters.beforeCreatedAt);
  if (filters.status) {
    const s = Array.isArray(filters.status) ? filters.status.join(",") : filters.status;
    url.searchParams.set("status", s);
  }
  if (filters.attendeeEmail) url.searchParams.set("attendeeEmail", filters.attendeeEmail);
  if (filters.attendeeName) url.searchParams.set("attendeeName", filters.attendeeName);
  if (filters.eventTypeIds?.length) {
    url.searchParams.set("eventTypeIds", filters.eventTypeIds.join(","));
  } else if (process.env.CAL_EVENT_TYPE_ID) {
    url.searchParams.set("eventTypeIds", String(process.env.CAL_EVENT_TYPE_ID));
  }
  const take = filters.take ?? DEFAULT_TAKE;
  const skip = filters.skip ?? 0;
  url.searchParams.set("take", String(take));
  url.searchParams.set("skip", String(skip));
  if (filters.sortStart) url.searchParams.set("sortStart", filters.sortStart);
  if (filters.sortCreated) url.searchParams.set("sortCreated", filters.sortCreated);

  const cacheKey = `list:${url.toString()}`;
  const cached = cacheGet<CalBookingListResult>(cacheKey);
  if (cached) return cached;

  const json = (await calGet(url.toString())) as
    | { data?: Record<string, unknown>[]; pagination?: Record<string, unknown> }
    | null;
  const rows = Array.isArray(json?.data) ? json!.data! : [];
  const bookings = rows.map(mapBooking);
  const pag = (json?.pagination ?? {}) as Record<string, unknown>;
  const totalItems = num(pag.totalItems);
  const remainingItems = num(pag.remainingItems);
  const hasNextPage = typeof pag.hasNextPage === "boolean" ? pag.hasNextPage : undefined;

  const result: CalBookingListResult = {
    bookings,
    pagination: {
      totalItems,
      remainingItems,
      take,
      skip,
      hasMore:
        hasNextPage ??
        (totalItems != null ? skip + bookings.length < totalItems : bookings.length === take),
    },
  };
  cacheSet(cacheKey, result);
  return result;
}

/** Fetch one booking by uid; null on 404. */
export async function getCalBooking(uid: string): Promise<CalBooking | null> {
  if (!uid) return null;
  const cacheKey = `get:${uid}`;
  const cached = cacheGet<CalBooking | null>(cacheKey);
  if (cached !== null) return cached;

  const url = `${CAL_API_BASE}/v2/bookings/${encodeURIComponent(uid)}`;
  const json = (await calGet(url)) as { data?: Record<string, unknown> } | null;
  if (!json) {
    cacheSet(cacheKey, null, 10_000);
    return null;
  }
  const raw = (json.data ?? json) as Record<string, unknown>;
  const booking = mapBooking(raw);
  cacheSet(cacheKey, booking);
  return booking;
}

/** Pulls all pages up to `maxPages` (safety cap). */
export async function listAllCalBookings(
  filters: CalBookingListFilters = {},
  opts: { pageSize?: number; maxPages?: number } = {}
): Promise<CalBooking[]> {
  const pageSize = opts.pageSize ?? 250;
  const maxPages = opts.maxPages ?? 20;
  const out: CalBooking[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const { bookings, pagination } = await listCalBookings({
      ...filters,
      take: pageSize,
      skip: page * pageSize,
    });
    out.push(...bookings);
    if (!pagination.hasMore) break;
  }
  return out;
}
