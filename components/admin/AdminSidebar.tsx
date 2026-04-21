"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, CalendarDays, Clock3, LayoutDashboard, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/patients", label: "Patients", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/availability", label: "Availability", icon: Clock3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-72 flex-col border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--card))]">
      <div className="space-y-4 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">L-EVATETELEVISIT</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-primary">Admin Portal</h2>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-sm text-primary">
          <p className="inline-flex items-center gap-2 font-medium">
            <Activity className="h-4 w-4" /> Facility Pulse
          </p>
          <p className="mt-1 text-xs text-primary/80">Normal Ops</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3 pb-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-ambient"
                  : "text-muted-foreground hover:bg-[hsl(var(--surface-low))]"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>
    </aside>
  );
}
