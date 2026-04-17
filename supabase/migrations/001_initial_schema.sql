create extension if not exists "uuid-ossp";

create table public.patients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now()
);

create table public.medical_history (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.patients(id) on delete cascade unique not null,
  patient_name text not null,
  date_of_birth date not null,
  address text not null,
  cell_number text not null,
  email text not null,
  sex text not null,
  emergency_contact_name text not null,
  emergency_contact_phone text not null,
  reason_for_visit text not null,
  last_physical_exam date,
  primary_physician text,
  general_health_good boolean not null,
  general_health_notes text,
  smokes boolean default false,
  smoke_per_day text,
  smoke_years text,
  drinks_alcohol boolean default false,
  alcohol_details text,
  tanning_bed boolean default false,
  takes_vitamins boolean default false,
  treatments_interested text,
  submitted_at timestamptz default now()
);

create table public.consent_records (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.patients(id) on delete cascade unique not null,
  consent_1 boolean not null default false,
  consent_2 boolean not null default false,
  consent_3 boolean not null default false,
  consent_4 boolean not null default false,
  consent_5 boolean not null default false,
  consent_6 boolean not null default false,
  full_name text not null,
  signed_at timestamptz default now()
);

create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references public.patients(id) on delete set null,
  cal_booking_id text unique not null,
  cal_booking_uid text unique,
  status text not null default 'pending',
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text,
  attendee_name text,
  attendee_email text,
  cal_raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.patients enable row level security;
alter table public.medical_history enable row level security;
alter table public.consent_records enable row level security;
alter table public.bookings enable row level security;

create policy "Anon can create patient" on public.patients
  for insert with check (true);

create policy "Anon can insert medical history" on public.medical_history
  for insert with check (true);

create policy "Anon can insert consent" on public.consent_records
  for insert with check (true);

create policy "Anon can insert booking" on public.bookings
  for insert with check (true);
