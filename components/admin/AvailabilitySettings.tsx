"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type DayName = (typeof DAYS)[number];

type TimeRange = { startTime: string; endTime: string };

type FormState = {
  scheduleId: number;
  timeZone: string;
  dayRanges: Record<DayName, TimeRange[]>;
};

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = String(Math.floor(i / 4)).padStart(2, "0");
  const minutes = String((i % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

function emptyDayRanges(): Record<DayName, TimeRange[]> {
  return {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };
}

function toForm(data: {
  id: number;
  timeZone: string;
  availability: Array<{ days: string[]; startTime: string; endTime: string }>;
}): FormState {
  const dayRanges = emptyDayRanges();
  for (const block of data.availability ?? []) {
    for (const day of block.days ?? []) {
      if (!DAYS.includes(day as DayName)) continue;
      dayRanges[day as DayName].push({
        startTime: block.startTime,
        endTime: block.endTime,
      });
    }
  }
  for (const day of DAYS) {
    dayRanges[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return {
    scheduleId: data.id,
    timeZone: data.timeZone || "America/New_York",
    dayRanges,
  };
}

function toPayload(form: FormState) {
  return {
    scheduleId: form.scheduleId,
    timeZone: form.timeZone,
    availability: DAYS.flatMap((day) => {
      const ranges = form.dayRanges[day];
      return ranges.map((range) => ({
        days: [day],
        startTime: range.startTime,
        endTime: range.endTime,
      }));
    }),
  };
}

function getNextEndTime(startTime: string): string {
  const idx = TIME_OPTIONS.indexOf(startTime);
  if (idx < 0) return "17:00";
  return TIME_OPTIONS[Math.min(idx + 4, TIME_OPTIONS.length - 1)];
}

export function AvailabilitySettings() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/availability", { cache: "no-store" });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) throw new Error(String(json.error ?? "Failed to fetch availability"));
        setForm(
          toForm({
            id: Number(json.id),
            timeZone: String(json.timeZone ?? "America/New_York"),
            availability: Array.isArray(json.availability)
              ? (json.availability as Array<{ days: string[]; startTime: string; endTime: string }>)
              : [],
          })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch availability");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeDaysCount = useMemo(() => {
    if (!form) return 0;
    return DAYS.filter((d) => form.dayRanges[d].length > 0).length;
  }, [form]);

  const invalidMessage = useMemo(() => {
    if (!form) return null;
    for (const day of DAYS) {
      const ranges = [...form.dayRanges[day]].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < ranges.length; i += 1) {
        if (ranges[i].startTime >= ranges[i].endTime) {
          return `${day}: end time must be after start time.`;
        }
        if (i > 0 && ranges[i - 1].endTime > ranges[i].startTime) {
          return `${day}: time ranges cannot overlap.`;
        }
      }
    }
    return null;
  }, [form]);

  async function save() {
    if (!form) return;
    if (invalidMessage) {
      setError(invalidMessage);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error ?? "Failed to save availability"));
      setForm(
        toForm({
          id: Number(json.id),
          timeZone: String(json.timeZone ?? form.timeZone),
          availability: Array.isArray(json.availability)
            ? (json.availability as Array<{ days: string[]; startTime: string; endTime: string }>)
            : [],
        })
      );
      setSuccess("Availability saved.");
      toast.success("Availability saved successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save availability";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading availability...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Weekly availability</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Control bookable hours in Cal.com for your admin team.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Timezone</p>
            <Select
              value={form.timeZone}
              onValueChange={(tz) => setForm((prev) => (prev ? { ...prev, timeZone: tz } : prev))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">
            Active days: <span className="text-primary">{activeDaysCount}</span> / 7
          </p>
          <Button onClick={() => void save()} disabled={saving || Boolean(invalidMessage)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save availability
          </Button>
        </div>
        {invalidMessage && (
          <p className="mb-3 text-sm text-destructive">
            {invalidMessage}
          </p>
        )}

        <div className="space-y-3">
          {DAYS.map((day) => {
            const ranges = form.dayRanges[day];
            return (
              <div
                key={day}
                className="rounded-xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--surface-low))]/40 p-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={ranges.length > 0}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          if (!prev) return prev;
                          const fallbackStart = "09:00";
                          return {
                            ...prev,
                            dayRanges: {
                              ...prev.dayRanges,
                              [day]: checked
                                ? prev.dayRanges[day].length
                                  ? prev.dayRanges[day]
                                  : [{ startTime: fallbackStart, endTime: getNextEndTime(fallbackStart) }]
                                : [],
                            },
                          };
                        })
                      }
                    />
                    {day}
                  </label>

                  <div className="space-y-2">
                    {ranges.map((range, idx) => (
                      <div key={`${day}-${idx}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                        <Select
                          value={range.startTime}
                          onValueChange={(value) =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                dayRanges: {
                                  ...prev.dayRanges,
                                  [day]: prev.dayRanges[day].map((r, i) =>
                                    i === idx ? { ...r, startTime: value } : r
                                  ),
                                },
                              };
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={`${day}-${idx}-start-${t}`} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={range.endTime}
                          onValueChange={(value) =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                dayRanges: {
                                  ...prev.dayRanges,
                                  [day]: prev.dayRanges[day].map((r, i) =>
                                    i === idx ? { ...r, endTime: value } : r
                                  ),
                                },
                              };
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => (
                              <SelectItem key={`${day}-${idx}-end-${t}`} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              const current = prev.dayRanges[day];
                              const next = [...current];
                              next.splice(idx, 1);
                              return {
                                ...prev,
                                dayRanges: { ...prev.dayRanges, [day]: next },
                              };
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {idx === ranges.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setForm((prev) => {
                                if (!prev) return prev;
                                const current = prev.dayRanges[day];
                                const last = current[current.length - 1];
                                const startTime = last?.endTime ?? "09:00";
                                return {
                                  ...prev,
                                  dayRanges: {
                                    ...prev.dayRanges,
                                    [day]: [
                                      ...current,
                                      {
                                        startTime,
                                        endTime: getNextEndTime(startTime),
                                      },
                                    ],
                                  },
                                };
                              })
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(error || success) && (
        <section className="rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
        </section>
      )}
    </div>
  );
}
