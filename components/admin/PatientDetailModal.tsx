"use client";

import { useEffect, useState } from "react";
import { format, parseISO, isBefore } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  cal_booking_id: string;
  cal_booking_uid: string | null;
  status: string;
  title: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  created_at: string;
};

type Medical = {
  patient_name?: string;
  date_of_birth?: string;
  address?: string;
  cell_number?: string;
  email?: string;
  sex?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  reason_for_visit?: string;
  last_physical_exam?: string | null;
  primary_physician?: string | null;
  general_health_good?: boolean;
  general_health_notes?: string | null;
  smokes?: boolean;
  smoke_per_day?: string | null;
  smoke_years?: string | null;
  drinks_alcohol?: boolean;
  alcohol_details?: string | null;
  tanning_bed?: boolean;
  takes_vitamins?: boolean;
  treatments_interested?: string | null;
  submitted_at?: string;
  [k: string]: unknown;
};

type Consent = {
  consent_1?: boolean;
  consent_2?: boolean;
  consent_3?: boolean;
  consent_4?: boolean;
  consent_5?: boolean;
  consent_6?: boolean;
  full_name?: string;
  signed_at?: string;
  [k: string]: unknown;
};

type Data = {
  patient: { id: string; created_at: string };
  medical_history: Medical | null;
  consent: Consent | null;
  bookings: Booking[];
};

function initials(name?: string | null) {
  if (!name) return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  return "secondary" as const;
}

function classify(b: Booking): "past" | "today" | "upcoming" {
  const start = parseISO(b.start_time);
  const end = parseISO(b.end_time);
  const now = new Date();
  if (isBefore(end, now)) return "past";
  if (isBefore(start, now)) return "today";
  return "upcoming";
}

function YesNo({ value }: { value: unknown }) {
  if (value === true) return <Badge variant="success">Yes</Badge>;
  if (value === false) return <Badge variant="secondary">No</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function PatientDetailModal({
  patientId,
  onClose,
}: {
  patientId: string | null;
  onClose: () => void;
}) {
  const open = Boolean(patientId);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      const res = await fetch(`/api/admin/patients/${patientId}`, { cache: "no-store" });
      if (!active) return;
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  const mh = data?.medical_history;
  const consent = data?.consent;
  const bookings = data?.bookings ?? [];

  const upcoming = bookings.filter((b) => classify(b) !== "past" && b.status !== "cancelled");
  const past = bookings.filter((b) => classify(b) === "past" && b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const consentCount = consent
    ? [1, 2, 3, 4, 5, 6].filter((i) => Boolean(consent[`consent_${i}`])).length
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-[min(96vw,1040px)] max-w-none overflow-y-auto sm:rounded-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Patient details</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="flex flex-wrap items-start gap-4 rounded-2xl bg-gradient-to-br from-primary/10 via-white to-white p-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-ambient">
                <span className="font-display text-lg font-semibold">{initials(mh?.patient_name)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {mh?.patient_name ?? "Unnamed patient"}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">ID {data.patient.id}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {mh?.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {mh.email}
                    </span>
                  )}
                  {mh?.cell_number && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {mh.cell_number}
                    </span>
                  )}
                  {mh?.address && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {mh.address}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:min-w-[280px]">
                <div className="rounded-xl bg-white/70 p-3 text-center">
                  <div className="font-display text-xl font-semibold text-primary">
                    {bookings.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                </div>
                <div className="rounded-xl bg-white/70 p-3 text-center">
                  <div className="font-display text-xl font-semibold text-emerald-600">
                    {upcoming.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Upcoming</div>
                </div>
                <div className="rounded-xl bg-white/70 p-3 text-center">
                  <div className="font-display text-xl font-semibold text-slate-600">
                    {past.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Personal & Contact</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Patient Name" value={mh?.patient_name} />
                <Field
                  label="Date of Birth"
                  value={mh?.date_of_birth ? format(parseISO(mh.date_of_birth), "PP") : null}
                />
                <Field label="Sex" value={mh?.sex} />
                <Field label="Email" value={mh?.email} />
                <Field label="Cell Number" value={mh?.cell_number} />
                <Field label="Address" value={mh?.address} />
                <Field label="Emergency Contact" value={mh?.emergency_contact_name} />
                <Field label="Emergency Phone" value={mh?.emergency_contact_phone} />
                <Field label="Primary Physician" value={mh?.primary_physician} />
              </div>
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Medical History</h3>
              </div>
              {!mh ? (
                <p className="mt-4 text-sm text-muted-foreground">No medical history on file.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Reason for Visit" value={mh.reason_for_visit} />
                  <Field
                    label="Last Physical Exam"
                    value={mh.last_physical_exam ? format(parseISO(mh.last_physical_exam), "PP") : null}
                  />
                  <Field label="General Health Good" value={<YesNo value={mh.general_health_good} />} />
                  <Field label="Health Notes" value={mh.general_health_notes} />
                  <Field label="Smokes" value={<YesNo value={mh.smokes} />} />
                  <Field label="Per Day" value={mh.smoke_per_day} />
                  <Field label="Years" value={mh.smoke_years} />
                  <Field label="Drinks Alcohol" value={<YesNo value={mh.drinks_alcohol} />} />
                  <Field label="Alcohol Details" value={mh.alcohol_details} />
                  <Field label="Tanning / Sun" value={<YesNo value={mh.tanning_bed} />} />
                  <Field label="Takes Vitamins" value={<YesNo value={mh.takes_vitamins} />} />
                  <Field label="Treatments Interested" value={mh.treatments_interested} />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">Consent</h3>
                </div>
                {consent && (
                  <Badge variant={consentCount === 6 ? "success" : "warning"}>
                    {consentCount}/6 acknowledged
                  </Badge>
                )}
              </div>
              {!consent ? (
                <p className="mt-4 text-sm text-muted-foreground">No consent record on file.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => {
                      const ok = Boolean(consent[`consent_${i}`]);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                            ok
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 text-muted-foreground"
                          )}
                        >
                          <CheckCircle2 className={cn("h-4 w-4", ok ? "text-emerald-600" : "text-muted-foreground/50")} />
                          Statement {i}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Signed by <span className="font-medium text-foreground">{consent.full_name ?? "—"}</span>
                    </span>
                    <span>
                      {consent.signed_at ? format(parseISO(consent.signed_at), "PPpp") : "—"}
                    </span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Bookings</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {bookings.length} total · {upcoming.length} upcoming · {past.length} completed · {cancelled.length} cancelled
                </span>
              </div>
              {bookings.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No bookings for this patient yet.</p>
              ) : (
                <div className="mt-4 space-y-5">
                  {upcoming.length > 0 && (
                    <BookingGroup title="Upcoming & scheduled" tone="emerald" bookings={upcoming} />
                  )}
                  {past.length > 0 && (
                    <BookingGroup title="Completed / past" tone="slate" bookings={past} />
                  )}
                  {cancelled.length > 0 && (
                    <BookingGroup title="Cancelled" tone="rose" bookings={cancelled} />
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingGroup({
  title,
  tone,
  bookings,
}: {
  title: string;
  tone: "emerald" | "slate" | "rose";
  bookings: Booking[];
}) {
  const dot =
    tone === "emerald" ? "bg-emerald-500" : tone === "slate" ? "bg-slate-400" : "bg-rose-500";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("inline-block h-2 w-2 rounded-full", dot)} />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title} · {bookings.length}
        </h4>
      </div>
      <ul className="space-y-2">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/30 px-4 py-3"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <div className="text-center leading-tight">
                <div className="text-[9px] font-medium uppercase tracking-wider">
                  {format(parseISO(b.start_time), "MMM")}
                </div>
                <div className="font-display text-base font-semibold">
                  {format(parseISO(b.start_time), "d")}
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {b.title ?? "Televisit appointment"}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(parseISO(b.start_time), "PPp")} — {format(parseISO(b.end_time), "p")}
                {b.timezone ? ` · ${b.timezone}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
              <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                {b.cal_booking_id}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
