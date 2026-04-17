import { PatientsTable } from "@/components/admin/PatientsTable";

export default function AdminPatientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-2 text-muted-foreground">
          Click a patient to view their full medical history, consent records, and all bookings.
        </p>
      </div>
      <PatientsTable />
    </div>
  );
}
