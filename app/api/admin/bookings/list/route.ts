import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import {
  listCalBookings,
  type CalBooking,
  type CalListStatus,
} from "@/lib/calBookings";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** UI-facing label that maps to Cal.com's `status` query param. */
type ViewFilter = "upcoming" | "unconfirmed" | "past" | "cancelled";

function mapView(view: ViewFilter): CalListStatus {
  if (view === "upcoming") return "upcoming";
  if (view === "unconfirmed") return "unconfirmed";
  if (view === "past") return "past";
  return "cancelled";
}

const ALLOWED_VIEWS: ViewFilter[] = ["upcoming", "unconfirmed", "past", "cancelled"];

function parseView(raw: string | null): ViewFilter {
  const v = (raw ?? "upcoming") as ViewFilter;
  return ALLOWED_VIEWS.includes(v) ? v : "upcoming";
}

function parseIsoOrNull(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

type BookingRow = {
  id: string;
  uid: string | null;
  title: string | null;
  status: string;
  start: string;
  end: string;
  duration: number | null;
  meeting_url: string | null;
  created_at: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  host_name: string | null;
  supabase_patient_id: string | null;
  patient_supabase_found: boolean;
  patient_phone: string | null;
};

function toRow(b: CalBooking, known: Map<string, { cell: string | null }>): BookingRow {
  const a = b.attendees[0];
  const h = b.hosts[0];
  const pid = b.supabasePatientId;
  const patient = pid ? known.get(pid) ?? null : null;
  return {
    id: String(b.id ?? b.uid ?? crypto.randomUUID()),
    uid: b.uid,
    title: b.title,
    status: b.status,
    start: b.start,
    end: b.end,
    duration: b.duration,
    meeting_url: b.meetingUrl,
    created_at: b.createdAt,
    attendee_name: a?.name ?? null,
    attendee_email: a?.email ?? null,
    host_name: h?.name ?? null,
    supabase_patient_id: pid,
    patient_supabase_found: pid ? known.has(pid) : false,
    patient_phone: patient?.cell ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const qp = req.nextUrl.searchParams;
  const page = Math.max(Number(qp.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(qp.get("pageSize") ?? "25"), 1), 100);
  const view = parseView(qp.get("view"));
  const search = (qp.get("search") ?? "").trim().toLowerCase();
  // Only honored when view === "past".
  const fromIso = parseIsoOrNull(qp.get("from"));
  const toIso = parseIsoOrNull(qp.get("to"));

  const skip = (page - 1) * pageSize;
  const sortStart: "asc" | "desc" = view === "upcoming" ? "asc" : "desc";

  try {
    const { bookings, pagination } = await listCalBookings({
      take: pageSize,
      skip,
      status: mapView(view),
      sortStart,
      ...(view === "past" && fromIso ? { afterStart: fromIso } : {}),
      ...(view === "past" && toIso ? { beforeEnd: toIso } : {}),
    });

    // Hydrate linked patient phone numbers in one round-trip.
    const pids = Array.from(
      new Set(bookings.map((b) => b.supabasePatientId).filter((v): v is string => Boolean(v)))
    );
    const known = new Map<string, { cell: string | null }>();
    if (pids.length) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("patients")
        .select("id, medical_history(cell_number)")
        .in("id", pids);
      for (const row of data ?? []) {
        const mhRaw = (row as Record<string, unknown>).medical_history as unknown;
        const mh = (Array.isArray(mhRaw) ? mhRaw[0] : mhRaw) as
          | { cell_number?: string }
          | null
          | undefined;
        if (row.id) known.set(String(row.id), { cell: mh?.cell_number ?? null });
      }
    }

    let rows = bookings.map((b) => toRow(b, known));

    if (search) {
      rows = rows.filter((r) => {
        const hay = `${r.attendee_name ?? ""} ${r.attendee_email ?? ""}`.toLowerCase();
        return hay.includes(search);
      });
    }

    return NextResponse.json({
      rows,
      page,
      pageSize,
      total: pagination.totalItems ?? rows.length,
      hasMore: pagination.hasMore,
    });
  } catch (e) {
    console.error("[admin/bookings/list]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list bookings" },
      { status: 500 }
    );
  }
}
