"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { clinicDateKey, formatDateTimeInClinic } from "@/lib/time";
import { CheckCircle2, Clock, Globe2, Lock, Video } from "lucide-react";
import { getLocalState, setLocalState } from "@/lib/onboarding";
import { CalendarWidget } from "@/components/booking/CalendarWidget";
import { BookingConfirmModal } from "@/components/booking/BookingConfirmModal";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { TimeSlotsSkeleton } from "@/components/booking/BookingSkeletons";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { Button } from "@/components/ui/button";
import { BookingHistory } from "@/components/patient/BookingHistory";

const practitionerName =
  process.env.NEXT_PUBLIC_BOOKING_PRACTITIONER_NAME ?? "Dr. Elena Rodriguez";
const careTypeLabel = process.env.NEXT_PUBLIC_BOOKING_CARE_TYPE ?? "General Wellness";
const visitDurationMin = Number(process.env.NEXT_PUBLIC_BOOKING_DURATION_MINUTES ?? "30") || 30;

function firstName(full: string) {
  const t = full.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? "";
}

export default function BookPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const s = getLocalState();
    if (!s || !s.intakeComplete) {
      const target = s && s.intakeStep === 2 ? "/onboarding/consent" : "/onboarding/medical-history";
      router.replace(target);
      return;
    }
    setPatientId(s.patientId);
    if (s.patientName) setPatientName(s.patientName);
    setAuthorized(true);
  }, [router]);

  const availableDates = useMemo(() => {
    const s = new Set<string>();
    for (const [d, slots] of Object.entries(slotsByDate)) {
      if (slots.length) s.add(d);
    }
    return s;
  }, [slotsByDate]);

  const daySlots = selectedDate ? slotsByDate[selectedDate] ?? [] : [];

  const getMonthCacheKey = useCallback(
    (m: Date, pid: string | null) => `levate_slots_${format(m, "yyyy-MM")}_${pid ?? "anon"}`,
    []
  );

  const loadMonth = useCallback(
    async (m: Date, pid: string | null) => {
      const cacheKey = getMonthCacheKey(m, pid);
      let cachedMonthSlots: Record<string, string[]> | null = null;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          cachedMonthSlots = JSON.parse(raw) as Record<string, string[]>;
          setSlotsByDate(cachedMonthSlots);
        }
      } catch {
        cachedMonthSlots = null;
      }

      if (cachedMonthSlots) {
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
        setRefreshing(false);
      }
      try {
        const start = startOfMonth(m).toISOString();
        const end = endOfMonth(m).toISOString();
        const qs = new URLSearchParams({ start, end });
        if (pid) qs.set("patientId", pid);
        const res = await fetch(`/api/cal/slots?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok || data.warning) throw new Error(data.error ?? data.warning ?? "Failed to load");
        const next = (data.slotsByDate ?? {}) as Record<string, string[]>;
        setSlotsByDate(next);
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        if (!cachedMonthSlots) {
          setSlotsByDate({});
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getMonthCacheKey]
  );

  useEffect(() => {
    if (!authorized || !patientId) return;
    let cancelled = false;
    void (async () => {
      const r = await fetch(`/api/patient/summary?patientId=${encodeURIComponent(patientId)}`);
      if (!r.ok || cancelled) return;
      const j = await r.json();
      const s = getLocalState();
      const resolvedName = (j.patient_name ?? s?.patientName ?? "").trim();
      setPatientName(resolvedName);
      setPatientEmail(j.email ?? "");
      if (s) {
        setLocalState({ ...s, patientName: resolvedName || s.patientName });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorized, patientId]);

  useEffect(() => {
    if (!authorized) return;
    void loadMonth(month, patientId);
  }, [authorized, month, patientId, loadMonth]);

  const defaultDateForMonth = useCallback((m: Date) => {
    const todayKey = clinicDateKey(new Date());
    const firstKey = `${format(m, "yyyy-MM")}-01`;
    if (firstKey < todayKey) return todayKey;
    const dow = new Date(`${firstKey}T00:00:00Z`).getUTCDay();
    const shift = dow === 0 ? 1 : dow === 6 ? 2 : 0;
    if (shift === 0) return firstKey;
    const d = new Date(`${firstKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + shift);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (selectedDate) return;
    setSelectedDate(defaultDateForMonth(month));
  }, [month, selectedDate, defaultDateForMonth]);

  const handleMonthChange = useCallback(
    (m: Date) => {
      setMonth(m);
      setSelectedDate(defaultDateForMonth(m));
      setSelectedSlot(null);
    },
    [defaultDateForMonth]
  );

  const selectionSummary =
    selectedSlot != null
      ? `Selected: ${formatDateTimeInClinic(selectedSlot)} (ET)`
      : "Select a date and time to continue.";
  const showCalendarSkeleton = loading || refreshing;
  const showSlotsSkeleton = loading || refreshing;

  if (!authorized) {
    return <BrandLoader />;
  }

  return (
    <div className="text-[#1a1f24]">
      <div className="space-y-8 py-2 sm:space-y-10 sm:py-4">
        <section className="overflow-hidden rounded-3xl border border-[#d6e0eb] bg-gradient-to-br from-white via-[#fbfdff] to-[#f4f8fd] shadow-[0_22px_70px_-38px_rgba(15,23,42,0.46)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative order-1 h-[340px] lg:order-2 lg:h-full lg:min-h-[480px]">
              <Image
                src="/images/booking-hero-premium.jpg"
                alt="Professional telehealth consultation"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 48vw, 100vw"
                quality={95}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-l from-[#071f50]/40 via-[#0c3e86]/10 to-transparent" />
              <div className="absolute bottom-6 right-6 hidden max-w-[280px] rounded-2xl border border-white/45 bg-[#0b2146]/35 p-5 text-white lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">Your selected care</p>
                <p className="mt-2 font-display text-2xl font-semibold">{careTypeLabel}</p>
                <p className="mt-1 text-sm text-white/90">Premium virtual consultation with clinical-grade privacy.</p>
              </div>
            </div>
            <div className="order-2 p-8 sm:p-10 lg:order-1 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a4ea9]">Book your televisit</p>
              <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#0f1419] sm:text-4xl">
                Welcome back{firstName(patientName) ? `, ${firstName(patientName)}` : ""}.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4f6071] sm:text-base">
                Secure your next appointment in under a minute. Pick an available slot and connect with your practitioner
                through a confidential HD video session.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5a6a7b]">
                This booking flow keeps everything in one place so you can confidently choose your time, confirm securely,
                and receive your session details without extra calls or forms.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-[#425264]">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0a51b7]" />
                  Flexible appointment availability throughout the day.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0a51b7]" />
                  Secure care coordination and encrypted patient data handling.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0a51b7]" />
                  Fast confirmation with immediate transition to your visit details.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-[#dfe5ed] bg-white shadow-[0_20px_55px_-34px_rgba(15,23,42,0.35)]">
          <div className="border-b border-[#e8edf4] bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-[#14a8a2]">
                  <Image src="/images/clinician-avatar.jpg" alt={practitionerName} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-display text-4xl font-semibold text-[#121a23]">{careTypeLabel}</p>
                  <p className="text-sm text-[#4f6071]">
                    <span className="font-medium text-[#0a51b7]">{practitionerName}</span> - Primary Care Physician
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#f1f6fb] px-3 py-2 text-sm font-medium text-[#425264]">
                  <Clock className="h-4 w-4 text-[#6f8297]" /> {visitDurationMin} minute session
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#f1f6fb] px-3 py-2 text-sm font-medium text-[#425264]">
                  <Video className="h-4 w-4 text-[#6f8297]" /> Televisit - High Definition
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl bg-[#eef5ff] px-3 py-2 text-sm font-medium text-[#0a51b7]">
                  <Globe2 className="h-4 w-4" /> Times shown in Eastern Time (ET)
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2">
            <div className="bg-[#f4f8fc] px-5 py-8 sm:px-8">
              <CalendarWidget
                embedded
                showTitle={false}
                month={month}
                onMonthChange={handleMonthChange}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                availableDates={availableDates}
                isLoading={showCalendarSkeleton}
              />
            </div>
            <div className="border-t border-[#e8edf4] bg-white px-5 py-8 sm:px-8 lg:border-l lg:border-t-0">
              {showSlotsSkeleton ? (
                <TimeSlotsSkeleton />
              ) : !selectedDate ? (
                <p className="text-sm text-[#5c6a76]">Choose an available date to unlock open appointment slots.</p>
              ) : (
                <TimeSlotPicker slots={daySlots} selected={selectedSlot} onSelect={(slot) => setSelectedSlot(slot)} />
              )}
            </div>
          </div>

          <div className="border-t border-[#e8edf4] px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm sm:items-center">
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 sm:mt-0 ${selectedSlot ? "text-emerald-600" : "text-[#c5ced6]"}`}
                  aria-hidden
                />
                <span className={selectedSlot ? "font-medium text-[#1a1f24]" : "text-[#5c6a76]"}>{selectionSummary}</span>
              </p>
              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-[#3d4d5f] hover:text-[#0f1419]"
                  onClick={() => setSelectedSlot(null)}
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  className="h-12 min-w-[190px] rounded-full bg-[#0a51b7] px-8 text-base font-semibold text-white shadow-[0_10px_22px_-10px_rgba(10,81,183,0.7)] hover:bg-[#08499f]"
                  disabled={!selectedSlot}
                  onClick={() => setModalOpen(true)}
                >
                  Confirm Booking
                </Button>
              </div>
            </div>
          </div>
        </section>

        {patientId && <BookingHistory patientId={patientId} />}

        <div className="mt-10 grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-[#e6eaef] bg-[#f7f9fc] p-6">
            <p className="font-display text-2xl font-semibold text-[#0f1419]">Preparing for your session</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5c6a76]">
              Please ensure you have a stable internet connection and are in a private, quiet space. Your medical records
              will be accessible via the records tab 15 minutes before the session starts.
            </p>
          </div>
          <div className="rounded-3xl border border-[#e6eaef] bg-[#f1f5fb] p-6">
            <p className="text-5xl font-semibold text-[#1f4f90]">98%</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5d6d7e]">Patient Satisfaction</p>
            <div className="mt-4 flex gap-3 rounded-2xl border border-[#dbe7f7] bg-white px-4 py-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#004AAD]" aria-hidden />
              <div>
                <p className="font-semibold text-[#0f1419]">Secure and private care</p>
                <p className="mt-1 text-sm text-[#5c6a76]">Encrypted consultations and coordinated support.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {patientId && (
        <BookingConfirmModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          slotIso={selectedSlot}
          patientId={patientId}
          patientName={patientName}
          patientEmail={patientEmail}
          onBooked={(summary) => {
            sessionStorage.setItem("levate_last_booking", JSON.stringify(summary));
            for (const key of Object.keys(sessionStorage)) {
              if (key.startsWith("levate_slots_")) sessionStorage.removeItem(key);
            }
            router.push("/confirmation");
          }}
          onSlotUnavailable={() => {
            for (const key of Object.keys(sessionStorage)) {
              if (key.startsWith("levate_slots_")) sessionStorage.removeItem(key);
            }
            setSelectedSlot(null);
            void loadMonth(month, patientId);
          }}
        />
      )}
    </div>
  );
}
