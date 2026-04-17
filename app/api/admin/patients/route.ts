import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const page = Math.max(Number(req.nextUrl.searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("pageSize") ?? "25"), 1),
    100
  );
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = createServiceClient();
    const { data, error, count } = await supabase
      .from("patients")
      .select(
        `
        id,
        created_at,
        medical_history(
          patient_name,
          email,
          cell_number,
          date_of_birth,
          sex,
          reason_for_visit,
          submitted_at
        ),
        consent_records(id, signed_at)
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((p) => {
      const mhRaw = p.medical_history as unknown;
      const mh = (Array.isArray(mhRaw) ? mhRaw[0] : mhRaw) as
        | {
            patient_name?: string;
            email?: string;
            cell_number?: string;
            date_of_birth?: string;
            sex?: string;
            reason_for_visit?: string;
            submitted_at?: string;
          }
        | null
        | undefined;
      const crRaw = p.consent_records as unknown;
      const cr = Array.isArray(crRaw) ? crRaw : crRaw ? [crRaw] : [];

      const name = mh?.patient_name ?? "—";
      const email = mh?.email ?? "—";
      const cell = mh?.cell_number ?? "—";
      const dob = mh?.date_of_birth ?? null;
      const sex = mh?.sex ?? null;
      const reason = mh?.reason_for_visit ?? null;
      const onboarding = cr.length > 0 ? "Complete" : mh ? "Partial" : "None";

      return {
        id: p.id as string,
        created_at: p.created_at as string,
        name,
        email,
        cell,
        dob,
        sex,
        reason,
        onboarding,
      };
    });

    const filtered = search
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(search) ||
            r.email.toLowerCase().includes(search) ||
            r.cell.toLowerCase().includes(search)
        )
      : rows;

    return NextResponse.json({
      rows: filtered,
      total: count ?? filtered.length,
      page,
      pageSize,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
