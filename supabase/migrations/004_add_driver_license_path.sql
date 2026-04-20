alter table public.consent_records
  add column if not exists driver_license_object_path text;
