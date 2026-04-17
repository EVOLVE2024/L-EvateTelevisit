"use client";

import { parseISO, format } from "date-fns";
import { Moon, Sun, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  slots: string[];
  selected: string | null;
  onSelect: (slotIso: string) => void;
  /** ISO slot times that should appear disabled (e.g. already held) */
  disabledSlots?: Set<string>;
  columns?: 1 | 2;
};

function groupLabel(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const GROUP_ORDER = ["Morning", "Afternoon", "Evening"] as const;

export function TimeSlotPicker({ slots, selected, onSelect, disabledSlots }: Props) {
  if (!slots.length) return <p className="text-sm text-muted-foreground">No times available.</p>;

  const grouped = slots.reduce<Record<string, string[]>>((acc, slot) => {
    const h = parseISO(slot).getHours();
    const label = groupLabel(h);
    if (!acc[label]) acc[label] = [];
    acc[label].push(slot);
    return acc;
  }, {});

  const groups = GROUP_ORDER.filter((label) => grouped[label]?.length).map((label) => [label, grouped[label]!] as const);
  const iconByGroup: Record<string, typeof Sun> = {
    Morning: Sunrise,
    Afternoon: Sun,
    Evening: Moon,
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#16212d]">Available Slots</h2>
      {groups.map(([label, group]) => (
        <div key={label} className="space-y-2.5">
          <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#8a96a2]">
            {iconByGroup[label] ? (() => {
              const Icon = iconByGroup[label];
              return <Icon className="h-3.5 w-3.5" />;
            })() : null}
            {label}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {group.map((slot) => {
              const isSelected = selected === slot;
              const isDisabled = disabledSlots?.has(slot) ?? false;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelect(slot)}
                  className={cn(
                    "h-11 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all",
                    isSelected && "border-[#0a51b7] bg-[#0a51b7] text-white shadow-[0_8px_16px_-10px_rgba(10,81,183,0.85)]",
                    !isSelected &&
                      !isDisabled &&
                      "border-[#dee5ed] bg-white text-[#16212d] hover:border-[#0a51b7]/40 hover:bg-[#f7fbff]",
                    isDisabled &&
                      "cursor-not-allowed border-[#e8edf2] bg-[#f3f6f9] text-[#b0bcc6] line-through decoration-[#b0bcc6]"
                  )}
                >
                  {format(parseISO(slot), "p")}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
