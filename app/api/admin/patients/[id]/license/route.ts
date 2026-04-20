import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-admin";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  try {
    const supabase = createServiceClient();
    const { data: consent, error: consentErr } = await supabase
      .from("consent_records")
      .select("driver_license_object_path")
      .eq("patient_id", params.id)
      .maybeSingle();
    if (consentErr) return NextResponse.json({ error: consentErr.message }, { status: 500 });

    const objectPath =
      consent && typeof consent.driver_license_object_path === "string"
        ? consent.driver_license_object_path
        : null;
    if (!objectPath) return NextResponse.json({ error: "Driver license not found" }, { status: 404 });

    const { data: fileBlob, error: fileErr } = await supabase.storage
      .from("driver-licenses")
      .download(objectPath);
    if (fileErr) return NextResponse.json({ error: fileErr.message }, { status: 500 });

    const bytes = await fileBlob.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": fileBlob.type || "application/octet-stream",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load driver license" },
      { status: 500 }
    );
  }
}
