import https from "node:https";

const CAL_API_BASE = "https://api.cal.com";
const CAL_API_VERSION = "2024-06-11";

export const CAL_WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type CalWeekDay = (typeof CAL_WEEK_DAYS)[number];

export type CalAvailabilityRange = {
  days: CalWeekDay[];
  startTime: string;
  endTime: string;
};

export type CalSchedule = {
  id: number;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availability: CalAvailabilityRange[];
};

function calHeaders() {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": CAL_API_VERSION,
    "Content-Type": "application/json",
  } as const;
}

function toObj(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseRange(value: unknown): CalAvailabilityRange | null {
  const row = toObj(value);
  if (!row) return null;
  const daysRaw = Array.isArray(row.days) ? row.days : [];
  const days = daysRaw
    .map((d) => String(d))
    .filter((d): d is CalWeekDay => CAL_WEEK_DAYS.includes(d as CalWeekDay));
  const startTime = String(row.startTime ?? "");
  const endTime = String(row.endTime ?? "");
  if (!days.length || !startTime || !endTime) return null;
  return { days, startTime, endTime };
}

function parseSchedule(value: unknown): CalSchedule | null {
  const row = toObj(value);
  if (!row) return null;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const availabilityRaw = Array.isArray(row.availability) ? row.availability : [];
  const availability = availabilityRaw
    .map(parseRange)
    .filter((v): v is CalAvailabilityRange => Boolean(v));
  return {
    id,
    name: String(row.name ?? "Default Schedule"),
    timeZone: String(row.timeZone ?? "America/New_York"),
    isDefault: Boolean(row.isDefault),
    availability,
  };
}

async function requestWithIpv4Fallback(
  url: string,
  method: "GET" | "POST" | "PATCH",
  headers: Record<string, string>,
  body?: string
): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    return { status: res.status, text: await res.text() };
  } catch {
    return new Promise((resolve, reject) => {
      const req = https.request(
        url,
        {
          method,
          headers: body
            ? { ...headers, "Content-Length": Buffer.byteLength(body).toString() }
            : headers,
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
      if (body) req.write(body);
      req.end();
    });
  }
}

async function calRequest(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const headers = calHeaders();
  if (!headers) throw new Error("CAL_API_KEY is not configured");
  const url = `${CAL_API_BASE}${path}`;
  const payload = body ? JSON.stringify(body) : undefined;
  const res = await requestWithIpv4Fallback(url, method, headers, payload);
  let parsed: unknown = {};
  try {
    parsed = res.text ? JSON.parse(res.text) : {};
  } catch {
    parsed = { raw: res.text };
  }
  if (res.status < 200 || res.status >= 300) {
    const out = toObj(parsed);
    const message =
      (out && typeof out.message === "string" && out.message) ||
      (out && typeof out.error === "string" && out.error) ||
      `Cal API error ${res.status}`;
    throw new Error(message);
  }
  return toObj(parsed) ?? {};
}

export async function getOrCreateDefaultSchedule(): Promise<CalSchedule> {
  const listJson = await calRequest("/v2/schedules", "GET");
  const rowsRaw = Array.isArray(listJson.data) ? listJson.data : [];
  const rows = rowsRaw.map(parseSchedule).filter((v): v is CalSchedule => Boolean(v));
  const eventTypeId = process.env.CAL_EVENT_TYPE_ID;
  let linkedScheduleId: number | null = null;
  if (eventTypeId) {
    try {
      const eventTypeJson = await calRequest(`/v2/event-types/${eventTypeId}`, "GET");
      const data = toObj(eventTypeJson.data);
      const scheduleIdRaw =
        (data && (data.scheduleId as unknown)) ||
        (toObj(data?.schedule)?.id as unknown) ||
        eventTypeJson.scheduleId;
      const scheduleId = Number(scheduleIdRaw);
      linkedScheduleId = Number.isFinite(scheduleId) ? scheduleId : null;
    } catch {
      linkedScheduleId = null;
    }
  }
  const existing =
    (linkedScheduleId ? rows.find((s) => s.id === linkedScheduleId) : null) ??
    rows.find((s) => s.isDefault) ??
    rows[0];
  if (existing) return existing;

  const created = await calRequest("/v2/schedules", "POST", {
    name: "Default Schedule",
    timeZone: "America/New_York",
    isDefault: true,
    availability: [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], startTime: "09:00", endTime: "17:00" }],
  });
  const schedule = parseSchedule(created.data);
  if (!schedule) throw new Error("Cal.com returned an invalid schedule response");
  return schedule;
}

function normalizeRanges(ranges: CalAvailabilityRange[]): CalAvailabilityRange[] {
  return ranges
    .map((r) => ({
      days: r.days.filter((d): d is CalWeekDay => CAL_WEEK_DAYS.includes(d)),
      startTime: String(r.startTime),
      endTime: String(r.endTime),
    }))
    .filter((r) => r.days.length > 0 && /^\d{2}:\d{2}$/.test(r.startTime) && /^\d{2}:\d{2}$/.test(r.endTime));
}

export async function updateSchedule(
  scheduleId: number,
  input: { timeZone: string; availability: CalAvailabilityRange[] }
): Promise<CalSchedule> {
  const payload = {
    timeZone: input.timeZone,
    availability: normalizeRanges(input.availability),
  };
  const json = await calRequest(`/v2/schedules/${scheduleId}`, "PATCH", payload);
  const schedule = parseSchedule(json.data);
  if (!schedule) throw new Error("Cal.com returned an invalid schedule response");
  return schedule;
}
