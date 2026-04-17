import { Skeleton } from "@/components/ui/skeleton";

export function TimeSlotsSkeleton() {
  const groups: { label: string; count: number }[] = [
    { label: "morning", count: 4 },
    { label: "afternoon", count: 6 },
    { label: "evening", count: 3 },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-6 w-36 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      {groups.map((g) => (
        <div key={g.label} className="space-y-2.5">
          <Skeleton className="h-3 w-20 rounded" />
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: g.count }).map((_, i) => (
              <Skeleton key={`${g.label}-${i}`} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
