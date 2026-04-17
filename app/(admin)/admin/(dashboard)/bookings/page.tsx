import { BookingCalendar } from "@/components/admin/BookingCalendar";

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Bookings</h1>
        <p className="mt-2 text-muted-foreground">
          Every appointment on one calendar — hover a booking to see patient details.
        </p>
      </div>
      <BookingCalendar />
    </div>
  );
}
