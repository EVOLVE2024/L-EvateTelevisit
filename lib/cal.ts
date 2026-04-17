import https from "node:https";

const CAL_API_BASE = "https://api.cal.com";

function calHeaders(calApiVersion: "2024-09-04" | "2026-02-25") {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": calApiVersion,
    "Content-Type": "application/json",
  } as const;
}

export type CalSlotDay = { date: string; slots: string[] };

async function fetchJsonOverIpv4(url: string, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers,
        agent: new https.Agent({ family: 4 }),
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode ?? 500;
          if (status < 200 || status >= 300) {
            reject(new Error(`Cal slots error ${status}: ${body}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            reject(new Error("Cal slots returned invalid JSON"));
          }
        });
      }
    );
    req.on("error", (error) => reject(error));
    req.end();
  });
}

async function requestOverIpv4(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: { ...headers, "Content-Length": Buffer.byteLength(body).toString() },
        agent: new https.Agent({ family: 4 }),
      },
      (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 500, text: chunks });
        });
      }
    );
    req.on("error", (error) => reject(error));
    req.write(body);
    req.end();
  });
}

export async function fetchCalSlotsRange(
  startIso: string,
  endIso: string
): Promise<CalSlotDay[]> {
  const headers = calHeaders("2024-09-04");
  const eventTypeId = process.env.CAL_EVENT_TYPE_ID;
  if (!headers || !eventTypeId) {
    return [];
  }
  const url = new URL(`${CAL_API_BASE}/v2/slots`);
  url.searchParams.set("eventTypeId", String(eventTypeId));
  url.searchParams.set("start", startIso);
  url.searchParams.set("end", endIso);
  let json: { data?: Record<string, { start?: string }[]> };
  try {
    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cal slots error ${res.status}: ${text}`);
    }
    json = (await res.json()) as { data?: Record<string, { start?: string }[]> };
  } catch {
    json = (await fetchJsonOverIpv4(url.toString(), headers)) as {
      data?: Record<string, { start?: string }[]>;
    };
  }
  const data = json.data ?? {};
  const days: CalSlotDay[] = [];
  for (const [date, slots] of Object.entries(data)) {
    days.push({
      date,
      slots: (slots ?? [])
        .map((s) => s.start)
        .filter((s): s is string => Boolean(s)),
    });
  }
  return days;
}

export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D+/g, "");
    return digits ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export type CalBookingInput = {
  start: string;
  name: string;
  email: string;
  timeZone: string;
  patientId: string;
  language?: string;
  title?: string;
};

export async function createCalBooking(input: CalBookingInput) {
  const headers = calHeaders("2026-02-25");
  const eventTypeId = process.env.CAL_EVENT_TYPE_ID;
  if (!headers || !eventTypeId) {
    throw new Error("Cal.com is not configured");
  }
  const payload = {
    eventTypeId: Number(eventTypeId),
    start: input.start,
    attendee: {
      name: input.name,
      email: input.email,
      timeZone: input.timeZone,
      language: input.language ?? "en",
    },
    bookingFieldsResponses: {
      title: input.title ?? `Televisit - ${input.name}`,
      supabase_id: input.patientId,
    },
  };
  const payloadBody = JSON.stringify(payload);
  console.log("[cal-booking] → POST /v2/bookings payload:", payloadBody);

  const { status, text: rawText } = await requestOverIpv4(
    `${CAL_API_BASE}/v2/bookings`,
    "POST",
    headers,
    payloadBody
  );

  let body: unknown = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { raw: rawText };
  }
  if (status < 200 || status >= 300) {
    console.error(`[cal-booking] ← Cal.com ${status} response:`, rawText);
    const bodyRecord = typeof body === "object" && body ? (body as Record<string, unknown>) : null;
    const nestedError =
      bodyRecord && typeof bodyRecord.error === "object" && bodyRecord.error
        ? (bodyRecord.error as Record<string, unknown>)
        : null;
    const message =
      (nestedError && typeof nestedError.message === "string" && nestedError.message) ||
      (bodyRecord && typeof bodyRecord.message === "string" && bodyRecord.message) ||
      (bodyRecord && typeof bodyRecord.error === "string" && bodyRecord.error) ||
      `Cal booking error ${status}`;
    throw new Error(`${message} (status ${status}): ${rawText.slice(0, 600)}`);
  }
  return body as Record<string, unknown>;
}

async function postWithIpv4Fallback(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<Record<string, unknown>> {
  const json = JSON.stringify(body ?? {});
  let status = 0;
  let rawText = "";
  try {
    const res = await fetch(url, { method: "POST", headers, body: json, cache: "no-store" });
    status = res.status;
    rawText = await res.text();
  } catch {
    const r = await requestOverIpv4(url, "POST", headers, json);
    status = r.status;
    rawText = r.text;
  }
  let parsed: unknown = {};
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    parsed = { raw: rawText };
  }
  if (status < 200 || status >= 300) {
    const bodyRecord = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : null;
    const nestedError =
      bodyRecord && typeof bodyRecord.error === "object" && bodyRecord.error
        ? (bodyRecord.error as Record<string, unknown>)
        : null;
    const message =
      (nestedError && typeof nestedError.message === "string" && nestedError.message) ||
      (bodyRecord && typeof bodyRecord.message === "string" && bodyRecord.message) ||
      (bodyRecord && typeof bodyRecord.error === "string" && bodyRecord.error) ||
      `Cal API error ${status}`;
    throw new Error(`${message} (status ${status})`);
  }
  return (parsed ?? {}) as Record<string, unknown>;
}

/** POST /v2/bookings/{uid}/confirm — caller must own the booking. */
export async function confirmCalBooking(uid: string): Promise<Record<string, unknown>> {
  if (!uid) throw new Error("Booking UID is required");
  const headers = calHeaders("2026-02-25");
  if (!headers) throw new Error("CAL_API_KEY is not set");
  return postWithIpv4Fallback(`${CAL_API_BASE}/v2/bookings/${encodeURIComponent(uid)}/confirm`, headers, {});
}

/** POST /v2/bookings/{uid}/decline with `{ reason }`. */
export async function declineCalBooking(uid: string, reason: string): Promise<Record<string, unknown>> {
  if (!uid) throw new Error("Booking UID is required");
  const headers = calHeaders("2026-02-25");
  if (!headers) throw new Error("CAL_API_KEY is not set");
  return postWithIpv4Fallback(
    `${CAL_API_BASE}/v2/bookings/${encodeURIComponent(uid)}/decline`,
    headers,
    { reason: reason || "Declined by host" }
  );
}

