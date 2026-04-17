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
  const res = await fetch(`${CAL_API_BASE}/v2/bookings`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const bodyRecord = typeof body === "object" && body ? (body as Record<string, unknown>) : null;
    const nestedError =
      bodyRecord && typeof bodyRecord.error === "object" && bodyRecord.error
        ? (bodyRecord.error as Record<string, unknown>)
        : null;
    throw new Error(
      (nestedError && typeof nestedError.message === "string" && nestedError.message) ||
        (bodyRecord && typeof bodyRecord.message === "string" && bodyRecord.message) ||
        (bodyRecord && typeof bodyRecord.error === "string" && bodyRecord.error) ||
        `Cal booking error ${res.status}`
    );
  }
  return body as Record<string, unknown>;
}

export async function cancelCalBooking(uid: string, reason?: string) {
  const headers = calHeaders("2026-02-25");
  if (!headers) throw new Error("Cal.com is not configured");
  const res = await fetch(`${CAL_API_BASE}/v2/bookings/${encodeURIComponent(uid)}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cancellationReason: reason ?? "Cancelled by patient" }),
    cache: "no-store",
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Cal cancel error ${res.status}: ${text}`);
  }
}
