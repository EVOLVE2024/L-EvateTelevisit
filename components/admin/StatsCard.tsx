import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "primary" | "emerald" | "amber" | "sky" | "violet" | "rose" | "slate";

const tones: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/15" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  sky: { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
  violet: { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  rose: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" },
};

type Props = {
  title: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  trend?: { value: string; direction?: "up" | "down" | "flat" };
};

export function StatsCard({ title, value, hint, icon: Icon, tone = "primary", trend }: Props) {
  const t = tones[tone];
  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
      ? "text-rose-600"
      : "text-muted-foreground";

  return (
    <Card className="border-[hsl(var(--border))]/10 transition-shadow hover:shadow-ambient">
      <CardContent className="flex items-start gap-4 p-5">
        {Icon && (
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1", t.bg, t.ring)}>
            <Icon className={cn("h-5 w-5", t.text)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight">{value}</span>
            {trend && <span className={cn("text-xs font-medium", trendColor)}>{trend.value}</span>}
          </div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
