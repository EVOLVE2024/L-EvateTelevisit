import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  patientId: z.string().uuid(),
});
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const runtime = "nodejs";

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/")[1]?.toLowerCase();
  if (fromType && /^[a-z0-9]+$/.test(fromType)) return fromType;
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const patientId = form.get("patientId");
    const fileEntry = form.get("file");

    const parsed = bodySchema.safeParse({ patientId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Driver license image is required" }, { status: 400 });
    }
    if (fileEntry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please upload an image under 4MB." },
        { status: 413 }
      );
    }
    if (!fileEntry.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: patient, error: patientErr } = await supabase
      .from("patients")
      .select("id")
      .eq("id", parsed.data.patientId)
      .maybeSingle();
    if (patientErr) return NextResponse.json({ error: patientErr.message }, { status: 500 });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const objectPath = `${parsed.data.patientId}/front.${extFromFile(fileEntry)}`;
    const bytes = await fileEntry.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("driver-licenses")
      .upload(objectPath, bytes, { contentType: fileEntry.type, upsert: true });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { error: consentErr } = await supabase
      .from("consent_records")
      .update({ driver_license_object_path: objectPath })
      .eq("patient_id", parsed.data.patientId);
    if (consentErr) return NextResponse.json({ error: consentErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, objectPath });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
