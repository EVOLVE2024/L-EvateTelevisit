"use client";

import { useEffect, useState } from "react";
import { formatDateTimeInClinic } from "@/lib/time";
import { Calendar, Clock, Video, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BookingItem = {
  uid: string | null;
  title: string | null;
  status: string;
  start: string;
  end: string;
  duration: number | null;
  meetingUrl: string | null;
  hostName: string | null;
};

type BookingData = {
  upcoming: BookingItem[];
  past: BookingItem[];
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  rescheduled: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-[#eef3fa] text-[#3a5278] border-[#c8d8ef]",
  unknown: "bg-gray-50 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  completed: "Completed",
  unknown: "Unknown",
};

function BookingCard({ booking, isPast }: { booking: BookingItem; isPast: boolean }) {
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.unknown;
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 transition-shadow sm:flex-row sm:items-start sm:justify-between ${
        isPast ? "border-[#e8edf4] bg-[#f9fafc]" : "border-[#d6e4f7] bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
          >
            {statusLabel}
          </span>
          {booking.duration && (
            <span className="inline-flex items-center gap-1 text-xs text-[#6b7f93]">
              <Clock className="h-3.5 w-3.5" />
              {booking.duration} min
            </span>
          )}
          {booking.meetingUrl && !isPast && (
            <span className="inline-flex items-center gap-1 text-xs text-[#6b7f93]">
              <Video className="h-3.5 w-3.5" /> HD Video
            </span>
          )}
        </div>
        <p className={`font-medium ${isPast ? "text-[#5a6a7b]" : "text-[#0f1419]"}`}>
          {booking.title ?? "Telehealth Appointment"}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-[#4f6071]">
          <Calendar className="h-4 w-4 shrink-0 text-[#7a95b0]" />
          {formatDateTimeInClinic(booking.start)} (MT)
        </p>
        {booking.hostName && (
          <p className="text-sm text-[#637384]">
            with <span className="font-medium text-[#2a4a6b]">{booking.hostName}</span>
          </p>
        )}
      </div>

      {booking.meetingUrl && !isPast && booking.status === "confirmed" && (
        <a
          href={booking.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[#0a51b7] px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(10,81,183,0.6)] transition hover:bg-[#08499f]"
        >
          Join Session <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export function BookingHistory({ patientId }: { patientId: string }) {
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/patient/bookings?patientId=${encodeURIComponent(patientId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error as string);
        setData(j as BookingData);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bookings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const hasUpcoming = (data?.upcoming?.length ?? 0) > 0;
  const hasPast = (data?.past?.length ?? 0) > 0;
  const isEmpty = !hasUpcoming && !hasPast;

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#dfe5ed] bg-white shadow-[0_20px_55px_-34px_rgba(15,23,42,0.25)]">
      <div className="border-b border-[#e8edf4] px-6 py-5 sm:px-8">
        <p className="font-display text-xl font-semibold text-[#0f1419]">Your Appointment History</p>
        <p className="mt-1 text-sm text-[#4f6071]">View all your upcoming and past telehealth sessions.</p>
      </div>

      <div className="px-6 py-6 sm:px-8">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-[#f0f4f9]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && isEmpty && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Calendar className="h-10 w-10 text-[#c5d4e8]" />
            <p className="font-medium text-[#4f6071]">No appointments found</p>
            <p className="text-sm text-[#7a8ea0]">Your bookings will appear here once you schedule a session.</p>
          </div>
        )}

        {!loading && !error && hasUpcoming && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a4ea9]">Upcoming</p>
            {data!.upcoming.map((b, i) => (
              <BookingCard key={b.uid ?? i} booking={b} isPast={false} />
            ))}
          </div>
        )}

        {!loading && !error && hasPast && (
          <div className={hasUpcoming ? "mt-6 space-y-3" : "space-y-3"}>
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => setShowPast((v) => !v)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7f93]">
                Past ({data!.past.length})
              </p>
              {showPast ? (
                <ChevronUp className="h-4 w-4 text-[#7a95b0]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#7a95b0]" />
              )}
            </button>
            {showPast && (
              <div className="space-y-3">
                {data!.past.map((b, i) => (
                  <BookingCard key={b.uid ?? i} booking={b} isPast />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
