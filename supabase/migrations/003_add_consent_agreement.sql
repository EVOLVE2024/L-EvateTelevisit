alter table public.consent_records
  add column if not exists consent_agreement boolean not null default false;
