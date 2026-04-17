-- Drop the local bookings mirror. Cal.com is now the sole source of truth
-- for booking records; admin views query Cal.com live and patient identity
-- is carried via the `supabase_id` custom field on each Cal.com booking.
--
-- No webhook, no reconciliation cron, no local bookings table.

drop table if exists public.bookings cascade;
