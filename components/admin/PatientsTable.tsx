"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Phone, Search, Users as UsersIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientDetailDrawer } from "@/components/admin/PatientDetailDrawer";

export type PatientRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  cell: string;
  dob: string | null;
  sex: string | null;
  reason: string | null;
  onboarding: "Complete" | "Partial" | "None";
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PatientsTable() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search,
        });
        const res = await fetch(`/api/admin/patients?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          setRows(data.rows ?? []);
          setTotal(data.total ?? 0);
        }
        setLoading(false);
      })();
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, pageSize, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          {total} patient{total === 1 ? "" : "s"}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/10 bg-[hsl(var(--card))]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="cursor-pointer transition-colors hover:bg-[hsl(var(--surface-low))]/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(r.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{r.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {r.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate">{r.email}</p>
                  </TableCell>
                  <TableCell>
                    {r.cell && r.cell !== "—" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.cell}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.dob ? format(parseISO(r.dob), "PP") : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate text-sm text-muted-foreground">{r.reason ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(parseISO(r.created_at), "PP")}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <PatientDetailDrawer
        patientId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
