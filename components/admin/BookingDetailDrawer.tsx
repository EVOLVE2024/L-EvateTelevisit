"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Hash,
  Link as LinkIcon,
  Mail,
  Phone,
  User,
  Video,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingActions } from "@/components/admin/BookingActions";
import type { CalBooking } from "@/lib/calBookings";
import {
  CLINIC_TIMEZONE_ABBR,
  formatLongDateTimeInClinic,
  formatTimeInClinic,
} from "@/lib/time";

type Patient = {
  id: string;
  name: string | null;
  email: string | null;
  cell: string | null;
};

function statusVariant(s: string) {
  if (s === "confirmed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  if (s === "pending") return "warning" as const;
  if (s === "rescheduled") return "secondary" as const;
  return "secondary" as const;
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 truncate text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function BookingDetailDrawer({
  uid,
  onClose,
  onViewPatient,
  onChanged,
}: {
  uid: string | null;
  onClose: () => void;
  onViewPatient?: (patientId: string) => void;
  onChanged?: () => void;
}) {
  const open = Boolean(uid);
  const [booking, setBooking] = useState<CalBooking | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!uid) {
      setBooking(null);
      setPatient(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (!active) return;
      if (res.ok) {
        const data = (await res.json()) as { booking: CalBooking; patient: Patient | null };
        setBooking(data.booking);
        setPatient(data.patient);
      } else {
        setBooking(null);
        setPatient(null);
        setError("Booking not found");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uid, reloadTick]);

  const attendee = booking?.attendees[0];
  const host = booking?.hosts[0];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[min(96vw,560px)]"
      title={booking?.title ?? "Booking"}
      subtitle={
        booking?.start
          ? `${formatLongDateTimeInClinic(booking.start)} — ${formatTimeInClinic(booking.end)} ${CLINIC_TIMEZONE_ABBR}`
          : undefined
      }
    >
      <div className="space-y-5 px-6 py-6">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        ) : error || !booking ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            {error ?? "Could not load booking."}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-gradient-to-br from-primary/10 via-white to-white p-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="mt-0.5 h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(booking.status)} className="capitalize">
                      {booking.status}
                    </Badge>
                    {booking.duration && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {booking.duration} min
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {formatLongDateTimeInClinic(booking.start)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ends at {formatTimeInClinic(booking.end)} {CLINIC_TIMEZONE_ABBR}
                  </p>
                  {booking.cancellationReason && (
                    <div className="mt-3 inline-flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>
                        <span className="font-semibold">Cancellation:</span>{" "}
                        {booking.cancellationReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {booking.status === "pending" && booking.uid && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1 text-xs text-amber-900">
                    This booking is awaiting your confirmation.
                  </div>
                  <BookingActions
                    uid={booking.uid}
                    status={booking.status}
                    size="sm"
                    onCompleted={() => {
                      setReloadTick((n) => n + 1);
                      onChanged?.();
                    }}
                  />
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patient
              </h3>
              <div className="grid gap-2">
                <Field icon={<User className="h-4 w-4" />} label="Name">
                  {patient?.name ?? attendee?.name ?? "—"}
                </Field>
                <Field icon={<Mail className="h-4 w-4" />} label="Email">
                  {patient?.email ?? attendee?.email ?? "—"}
                </Field>
                {patient?.cell && (
                  <Field icon={<Phone className="h-4 w-4" />} label="Cell">
                    {patient.cell}
                  </Field>
                )}
                <Field icon={<Globe className="h-4 w-4" />} label="Attendee Timezone">
                  {attendee?.timeZone ?? "—"}
                </Field>
                {booking.supabasePatientId ? (
                  <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {patient ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      <span>
                        Linked patient:{" "}
                        <span className="font-mono">{booking.supabasePatientId.slice(0, 8)}</span>
                        {!patient && " (not found in Supabase)"}
                      </span>
                    </div>
                    {patient && onViewPatient && (
                      <button
                        type="button"
                        onClick={() => onViewPatient(patient.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View profile <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Booking has no Supabase patient linkage (unlinked).</span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Meeting
              </h3>
              <div className="grid gap-2">
                {booking.meetingUrl && (
                  <a
                    href={booking.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <Video className="h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Meeting Link
                      </p>
                      <p className="truncate text-sm text-primary group-hover:underline">
                        {booking.meetingUrl}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {booking.location && booking.location !== booking.meetingUrl && (
                  <Field icon={<LinkIcon className="h-4 w-4" />} label="Location">
                    {booking.location}
                  </Field>
                )}
                <Field icon={<User className="h-4 w-4" />} label="Host">
                  {host?.name ?? "—"}
                  {host?.email ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">· {host.email}</span>
                  ) : null}
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference
              </h3>
              <div className="grid gap-2">
                <Field icon={<Hash className="h-4 w-4" />} label="Cal Booking ID">
                  <span className="font-mono text-xs">{booking.id ?? "—"}</span>
                </Field>
                <Field icon={<Hash className="h-4 w-4" />} label="Cal Booking UID">
                  <span className="font-mono text-xs">{booking.uid ?? "—"}</span>
                </Field>
                {booking.createdAt && (
                  <Field icon={<Clock className="h-4 w-4" />} label="Created">
                    {formatLongDateTimeInClinic(booking.createdAt)}
                  </Field>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}
