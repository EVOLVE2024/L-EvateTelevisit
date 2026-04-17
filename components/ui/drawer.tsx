"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight side drawer with dialog semantics; no external deps. */
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  side?: "right" | "left";
};

export function Drawer({
  open,
  onClose,
  children,
  width = "w-[min(96vw,640px)]",
  title,
  subtitle,
  side = "right",
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 bottom-0 flex flex-col border-[hsl(var(--border))]/20 bg-[hsl(var(--background))] shadow-2xl transition-transform duration-300 ease-out",
          width,
          side === "right"
            ? cn("right-0 border-l", open ? "translate-x-0" : "translate-x-full")
            : cn("left-0 border-r", open ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))]/10 px-6 py-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-low))] hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
