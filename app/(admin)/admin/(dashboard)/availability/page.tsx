import { AvailabilitySettings } from "@/components/admin/AvailabilitySettings";

export default function AdminAvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Availability</h1>
        <p className="mt-2 text-muted-foreground">
          Manage when admins are available to receive bookings through Cal.com.
        </p>
      </div>
      <AvailabilitySettings />
    </div>
  );
}
