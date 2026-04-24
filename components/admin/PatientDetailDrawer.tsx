"use client";

import { useEffect, useState } from "react";
import { format, parseISO, isBefore } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import {
  CLINIC_TIMEZONE_ABBR,
  formatDayOfMonthInClinic,
  formatLongDateTimeInClinic,
  formatMediumDateTimeInClinic,
  formatMonthShortInClinic,
  formatTimeInClinic,
} from "@/lib/time";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  cal_booking_id: string | null;
  cal_booking_uid: string | null;
  status: string;
  title: string | null;
  start_time: string;
  end_time: string;
  timezone: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  created_at: string | null;
  meeting_url: string | null;
  location: string | null;
  cancellation_reason: string | null;
  supabase_patient_id: string | null;
};

type Medical = {
  patient_name?: string;
  clinic_name?: string | null;
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
  consent_agreement?: boolean;
  full_name?: string;
  signed_at?: string;
  driver_license_object_path?: string | null;
  driver_license_available?: boolean;
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
  if (s === "rescheduled") return "secondary" as const;
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

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

/** Yes/No habit card with follow-up details shown only when the answer is "Yes". */
function HabitCard({
  label,
  yes,
  details,
  className,
}: {
  label: string;
  yes: unknown;
  details: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  const shown = yes === true ? details.filter((d) => d.value != null && d.value !== "") : [];
  return (
    <div
      className={cn(
        "rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <YesNo value={yes} />
      </div>
      {shown.length > 0 && (
        <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-foreground">
          {shown.map((d, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.label}</dt>
              <dd className="break-all font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </h4>
  );
}

export function PatientDetailDrawer({
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
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[min(96vw,720px)]"
      title={mh?.patient_name ?? "Patient details"}
      subtitle={data ? `ID ${data.patient.id}` : undefined}
    >
      <div className="space-y-6 px-6 py-6">
        {loading || !data ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </>
        ) : (
          <>
            <section className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-primary/10 via-white to-white p-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-ambient">
                <span className="font-display text-base font-semibold">{initials(mh?.patient_name)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/70 p-2 text-center">
                    <div className="font-display text-lg font-semibold text-primary">{bookings.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2 text-center">
                    <div className="font-display text-lg font-semibold text-emerald-600">
                      {upcoming.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Upcoming</div>
                  </div>
                  <div className="rounded-xl bg-white/70 p-2 text-center">
                    <div className="font-display text-lg font-semibold text-slate-600">{past.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Personal & Contact</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Patient Name" value={mh?.patient_name} />
                <Field label="Clinic Name" value={mh?.clinic_name} />
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
                <div className="mt-4 space-y-5">
                  <div>
                    <SubHeading>Visit</SubHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Reason for Visit"
                        value={mh.reason_for_visit}
                        className="sm:col-span-2"
                      />
                      <Field
                        label="Last Physical Exam"
                        value={mh.last_physical_exam ? format(parseISO(mh.last_physical_exam), "PP") : null}
                      />
                      <Field
                        label="General Health"
                        value={<YesNo value={mh.general_health_good} />}
                      />
                      {mh.general_health_notes && (
                        <Field
                          label="Health Notes"
                          value={mh.general_health_notes}
                          className="sm:col-span-2"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <SubHeading>Habits</SubHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <HabitCard
                        label="Smoking"
                        yes={mh.smokes}
                        details={[
                          { label: "Per day", value: mh.smoke_per_day },
                          { label: "Years", value: mh.smoke_years },
                        ]}
                      />
                      <HabitCard
                        label="Alcohol"
                        yes={mh.drinks_alcohol}
                        details={[{ label: "Details", value: mh.alcohol_details }]}
                      />
                      <Field label="Tanning / Sun" value={<YesNo value={mh.tanning_bed} />} />
                      <Field label="Takes Vitamins" value={<YesNo value={mh.takes_vitamins} />} />
                    </div>
                  </div>

                  {mh.treatments_interested && (
                    <div>
                      <SubHeading>Treatments</SubHeading>
                      <Field
                        label="Treatments Interested"
                        value={mh.treatments_interested}
                      />
                    </div>
                  )}
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
                  <div className="grid gap-2 sm:grid-cols-2">
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
                          {ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/50" />
                          )}
                          Statement {i}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Signed by <span className="font-medium text-foreground">{consent.full_name ?? "—"}</span>
                    </span>
                    <span>{consent.signed_at ? formatLongDateTimeInClinic(consent.signed_at) : "—"}</span>
                  </div>
                  <div className="rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <IdCard className="h-3.5 w-3.5" /> Driver&apos;s License (Front)
                    </p>
                    {consent.driver_license_available ? (
                      <div className="mt-2 space-y-2">
                        <img
                          src={`/api/admin/patients/${data.patient.id}/license`}
                          alt="Patient driver license front"
                          className="max-h-72 w-full rounded-lg border border-[hsl(var(--border))]/20 object-contain bg-white"
                        />
                        <a
                          href={`/api/admin/patients/${data.patient.id}/license`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open full image <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No driver license uploaded.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Bookings</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {bookings.length} total · {upcoming.length} upcoming · {past.length} completed · {cancelled.length}{" "}
                  cancelled
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
          </>
        )}
      </div>
    </Drawer>
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
                  {formatMonthShortInClinic(b.start_time)}
                </div>
                <div className="font-display text-base font-semibold">
                  {formatDayOfMonthInClinic(b.start_time)}
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {b.title ?? "Televisit appointment"}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatMediumDateTimeInClinic(b.start_time)} — {formatTimeInClinic(b.end_time)}{" "}
                {CLINIC_TIMEZONE_ABBR}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
              {b.meeting_url && (
                <a
                  href={b.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Meeting <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
