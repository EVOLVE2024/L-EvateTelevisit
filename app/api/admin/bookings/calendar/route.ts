import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
} from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const monthParam = req.nextUrl.searchParams.get("month");
  const anchor = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const base = isValid(anchor) ? anchor : new Date();

  const gridStart = startOfWeek(startOfMonth(base), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(base), { weekStartsOn: 0 });

  try {
    const supabase = createServiceClient();
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        patient_id,
        cal_booking_id,
        status,
        title,
        start_time,
        end_time,
        timezone,
        attendee_name,
        attendee_email
        `
      )
      .gte("start_time", gridStart.toISOString())
      .lte("start_time", gridEnd.toISOString())
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const patientIds = Array.from(
      new Set((bookings ?? []).map((b) => b.patient_id).filter(Boolean))
    ) as string[];

    let patientMap: Record<
      string,
      { name: string | null; email: string | null; cell: string | null }
    > = {};
    if (patientIds.length > 0) {
      const { data: mhRows } = await supabase
        .from("medical_history")
        .select("patient_id, patient_name, email, cell_number")
        .in("patient_id", patientIds);
      patientMap = Object.fromEntries(
        (mhRows ?? []).map((r) => [
          r.patient_id,
          {
            name: (r.patient_name as string | null) ?? null,
            email: (r.email as string | null) ?? null,
            cell: (r.cell_number as string | null) ?? null,
          },
        ])
      );
    }

    const rows = (bookings ?? []).map((b) => {
      const pinfo = b.patient_id ? patientMap[b.patient_id as string] : undefined;
      return {
        ...b,
        patient: {
          id: b.patient_id,
          name: pinfo?.name ?? b.attendee_name ?? null,
          email: pinfo?.email ?? b.attendee_email ?? null,
          cell: pinfo?.cell ?? null,
        },
      };
    });

    return NextResponse.json({
      rangeStart: gridStart.toISOString(),
      rangeEnd: gridEnd.toISOString(),
      bookings: rows,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
