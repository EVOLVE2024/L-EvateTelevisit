Cursor Agent Prompt: L-Evate Premium Patient Portal – Full Booking System (Revised)

🧠 ROLE & CONTEXT
You are a senior full-stack engineer building a fully customized medical booking portal called L-Evate Premium Patient Portal using:

Next.js 14 (App Router)
Supabase (database only — for storing form data and bookings)
Cal.com API v2 (custom integration — NO iframes, NO embeds)
Stitch MCP Server (for UI design reference — fetch all screens listed below before writing any UI code)
Google reCAPTCHA v2 (bot protection on booking step)
Tailwind CSS + shadcn/ui (component library)


🎨 DESIGN SYSTEM — FETCH FROM STITCH FIRST
Before writing any UI code, use the Stitch MCP server to fetch all 4 screens below and extract the full design system (colors, typography, spacing, component styles, layout, border radius, shadows, icon styles):
ScreenStitch 
 - PathPatient Medical History Form : projects/2551433499879791642/screens/2bebc0b07f6b48ef8da0009cb0fcc44a
 - Pre-Treatment Consent Form : projects/2551433499879791642/screens/c1206e4a3e124209ab5290c0cd72a006
 - Schedule Appointment : projects/2551433499879791642/screens/44b55ae0c2904674be4baea68d998f11
 - Admin Portal : projects/2551433499879791642/screens/7798d2a5399b444baed290f906b69bac

Match the Stitch designs pixel-faithfully. Do not substitute generic shadcn defaults — apply the extracted design tokens everywhere.

👤 AUTH MODEL — CRITICAL
There is NO customer authentication. Customers are anonymous visitors.

Customers do not sign up, log in, or have accounts
The onboarding forms (medical history + consent) are shown once per browser and then never again
Use localStorage as the primary gate with the Supabase patient row ID stored in localStorage as the persistent reference
Only the Admin Panel has email/password login (Supabase Auth)

PUBLIC ROUTES  (no auth):
  /                          ← Entry point
  /onboarding/medical-history
  /onboarding/consent
  /book
  /confirmation

PROTECTED ROUTES (Supabase Auth — admin only):
  /admin/login
  /admin/**

🗂️ PROJECT STRUCTURE
/app
  /(patient)
    /page.tsx
    /onboarding
      /medical-history/page.tsx
      /consent/page.tsx
    /book/page.tsx
    /confirmation/page.tsx
  /(admin)
    /admin
      /login/page.tsx
      /page.tsx
      /users/page.tsx
      /users/[id]/page.tsx
      /bookings/page.tsx
      /bookings/[id]/page.tsx
  /api
    /webhook/route.ts
    /cal
      /slots/route.ts
      /booking/route.ts
      /cancel/route.ts
    /admin
      /users/route.ts
      /bookings/route.ts
      /stats/route.ts
/components
  /forms
    /MedicalHistoryForm.tsx
    /ConsentForm.tsx
  /booking
    /CalendarWidget.tsx
    /TimeSlotPicker.tsx
    /RecaptchaWrapper.tsx
    /BookingConfirmModal.tsx
  /admin
    /UserTable.tsx
    /BookingTable.tsx
    /UserDetailPanel.tsx
    /StatsCard.tsx
/lib
  /supabase
    /client.ts
    /server.ts
  /cal.ts
  /recaptcha.ts
  /onboarding.ts
/middleware.ts
/supabase
  /migrations/
    /001_initial_schema.sql

🗄️ DATABASE SCHEMA — SUPABASE
sql-- 001_initial_schema.sql

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

-- RLS
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

-- Service role bypasses all RLS (admin routes + webhook)

📱 CUSTOMER ONBOARDING FLOW — NO AUTH
localStorage Schema
typescript// lib/onboarding.ts

const STORAGE_KEY = 'levate_patient';

export interface PatientLocalState {
  patientId: string;
  medicalHistoryDone: boolean;
  consentDone: boolean;
  onboardingComplete: boolean;
}

export function getLocalState(): PatientLocalState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setLocalState(state: PatientLocalState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
Entry Point (/page.tsx) — Routing Logic
On load → read localStorage:

  null:
    → INSERT into patients → get new patient.id
    → Save to localStorage (all flags false)
    → Redirect to /onboarding/medical-history

  exists, onboardingComplete = false, medicalHistoryDone = false:
    → Redirect to /onboarding/medical-history

  exists, medicalHistoryDone = true, consentDone = false:
    → Redirect to /onboarding/consent

  exists, onboardingComplete = true:
    → Redirect to /book
Step 1 — Medical History Form (/onboarding/medical-history)
Validate with zod + react-hook-form. All fields match Stitch design exactly.
Fields:

Patient (full name) — text
Date of birth — date picker
Address — text
Cell number — tel
Email address — email
Sex — select (Male / Female / Other / Prefer not to say)
Emergency contact name — text
Emergency contact phone — tel
Reason for your visit today? — textarea
Date of last physical exam — date picker
Name of primary physician — text
Is your general health good? — Yes/No radio; if No → show textarea "please explain"
Do you smoke? — Yes/No radio; if Yes → show "How many per day?" + "For how many years?"
Do you drink alcohol? — Yes/No radio; if Yes → show "How much?" + "How often?"
Do you regularly use a tanning bed or sun exposure? — Yes/No radio
Do you regularly take vitamins? — Yes/No radio
Please list any treatments or products that interest you — textarea

On submit:

INSERT into medical_history with patient_id from localStorage
Update localStorage: medicalHistoryDone: true
Navigate to /onboarding/consent

Step 2 — Consent Form (/onboarding/consent)
All 6 checkboxes must be checked to enable submit. No signature, no image.
Consent statements:

I understand that the proposed treatment has been explained to me, including its goals and expected outcomes.
I understand that results may vary between individuals and are not guaranteed.
I understand that ongoing evaluation or follow-up may be necessary to achieve optimal results.
I have been informed of possible side effects and complications that may occur during or after the treatment.
I understand that it is my responsibility to follow post-treatment care instructions provided by my practitioner.
I voluntarily consent to proceed with the proposed treatment.

Also include:

Full name — text input (typed, no signature)
Date — auto-populated today's date, read-only display

On submit:

INSERT into consent_records with patient_id from localStorage
Update localStorage: consentDone: true, onboardingComplete: true
Navigate to /book


📅 BOOKING WIDGET (/book)
Stitch design: projects/2551433499879791642/screens/44b55ae0c2904674be4baea68d998f11
No Cal.com embed. Fully custom UI.
Flow
1. Guard: if localStorage onboardingComplete !== true → redirect to /

2. Fetch available slots via GET /api/cal/slots

3. Render custom month-view calendar:
   - Highlight dates with availability
   - Gray out past dates + unavailable dates
   - Allow prev/next month navigation

4. On date click → fetch + display time slot buttons for that date

5. On time slot click → open BookingConfirmModal:
   - Display: selected date, selected time
   - Display: patient name + email (fetched from Supabase using patientId from localStorage)
   - reCAPTCHA v2 checkbox — "Confirm Booking" disabled until checked
   - On confirm:
       a. POST /api/cal/booking { slotTime, recaptchaToken, patientId }
       b. Server verifies reCAPTCHA — if fail: toast error, reset reCAPTCHA, abort
       c. Server fetches name + email from medical_history WHERE patient_id = patientId
       d. Server calls Cal.com POST /v2/bookings:
            { eventTypeId, start: slotTime, attendee: { name, email, timeZone },
              metadata: { patient_id: patientId } }
       e. On success → navigate to /confirmation

6. /confirmation:
   - Show booking summary (date, time, name, email)
   - "Book another appointment" button → returns to /book with cleared selection

🔗 CAL.COM WEBHOOK (/api/webhook/route.ts)
Register in Cal.com dashboard: POST https://yourdomain.com/webhook
typescriptexport async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get('x-cal-signature-256');
  const expected = `sha256=${crypto
    .createHmac('sha256', process.env.CAL_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')}`;

  if (signature !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { triggerEvent, payload } = JSON.parse(rawBody);

  const statusMap: Record<string, string> = {
    BOOKING_CREATED: 'pending',
    BOOKING_CONFIRMED: 'confirmed',
    BOOKING_CANCELLED: 'cancelled',
    BOOKING_RESCHEDULED: 'rescheduled',
    BOOKING_REJECTED: 'cancelled',
  };

  const supabase = createServiceClient();

  await supabase.from('bookings').upsert({
    patient_id: payload.metadata?.patient_id ?? null,
    cal_booking_id: String(payload.bookingId ?? payload.id),
    cal_booking_uid: payload.uid,
    status: statusMap[triggerEvent] ?? 'pending',
    title: payload.title,
    start_time: payload.startTime,
    end_time: payload.endTime,
    timezone: payload.responses?.timeZone?.value ?? payload.timeZone,
    attendee_name: payload.responses?.name?.value ?? payload.attendees?.[0]?.name,
    attendee_email: payload.responses?.email?.value ?? payload.attendees?.[0]?.email,
    cal_raw_payload: { triggerEvent, payload },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'cal_booking_id' });

  return NextResponse.json({ received: true });
}

🛡️ ADMIN PANEL (/admin)
Stitch design: projects/2551433499879791642/screens/7798d2a5399b444baed290f906b69bac
Auth — Supabase Email/Password

/admin/login — email + password via supabase.auth.signInWithPassword()
Middleware redirects unauthenticated requests on /admin/** to /admin/login
Logout button → supabase.auth.signOut()
First admin user created manually in Supabase Auth dashboard — no public signup

Middleware
typescript// middleware.ts
export async function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith('/admin') &&
    !req.nextUrl.pathname.startsWith('/admin/login')
  ) {
    const supabase = createServerClient(/* cookie config */);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
Dashboard (/admin)

Stat cards: Total Patients, Total Bookings, Upcoming Today, Pending
Recent bookings table (last 10): patient name, date/time, status badge
Sidebar nav: Dashboard, Patients, Bookings

Patients (/admin/users)

Paginated table: Name, Email, Cell, Signup Date, Onboarding Status, Booking Count
Search by name or email
Click row → /admin/users/[id]

Patient Detail (/admin/users/[id])

All 17 medical history fields — read-only display
Consent record: 6 consent items shown as checked indicators, full name, signed date
Booking history table for that patient

Bookings (/admin/bookings)

Paginated table: Patient Name, Email, Date/Time, Status badge (color-coded), Cal Booking ID
Filter: status dropdown, date range
Search by name or email
Cancel button per row → calls Cal.com DELETE /v2/bookings/{uid} + updates Supabase status to cancelled

Booking Detail (/admin/bookings/[id])

Full booking details
Status badge
Collapsible raw JSON payload viewer
Cancel Booking button with confirmation dialog


⚙️ IMPLEMENTATION RULES

Cal.com API calls — server-side only. CAL_API_KEY never reaches the browser
Supabase service role — server-side only. Never in client code
Anon Supabase client used only for patient-side inserts
No canvas, no image upload, no file handling anywhere in the system
Form validation — zod + react-hook-form on all forms
Conditional fields — show/hide based on Yes/No radio answers
Date handling — date-fns; use browser Intl.DateTimeFormat().resolvedOptions().timeZone for timezone
reCAPTCHA — react-google-recaptcha; reset token after any failed attempt
Toast notifications — sonner for all feedback
Skeleton loaders — on all async data sections
Cal.com API header — always send cal-api-version: 2024-09-04
Webhook HMAC — always verify before processing
Mobile responsive — all patient-facing pages; admin can be desktop-first
No auth UI on patient pages — zero login/register elements visible to customers


📦 REQUIRED PACKAGES
bashnpm install @supabase/ssr @supabase/supabase-js
npm install react-hook-form zod @hookform/resolvers
npm install date-fns
npm install sonner
npm install react-google-recaptcha
npm install lucide-react
npm install clsx tailwind-merge

✅ BUILD ORDER

Scaffold Next.js 14 + Tailwind + shadcn/ui
Fetch all 4 Stitch screens — extract and apply design tokens globally
Set up Supabase — run migration, configure RLS
Build lib/supabase/client.ts (anon) + lib/supabase/server.ts (service role)
Build lib/onboarding.ts — localStorage helpers
Build entry point / — routing logic
Build Medical History form — all 17 fields, conditional logic, Supabase insert
Build Consent form — 6 checkboxes, typed full name, date display, Supabase insert
Build lib/cal.ts — Cal.com API client (server-side)
Build /api/cal/slots proxy route
Build booking calendar widget — custom month view, slot fetching
Build BookingConfirmModal with reCAPTCHA
Build /api/cal/booking — reCAPTCHA verify + booking creation
Build /confirmation page
Build /api/webhook — HMAC verify + Supabase upsert
Build middleware.ts — admin-only protection
Build /admin/login
Build admin dashboard, patients list, patient detail, bookings list, booking detail
Build all admin API routes with session verification
End-to-end test: patient journey + admin panel
Output .env.local.example


🌍 ENVIRONMENT VARIABLES
NEXT_PUBLIC_SUPABASE_URL=https://fuawkixzzbgbhnoonnqs.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YXdraXh6emJnYmhub29ubnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTQwMDEsImV4cCI6MjA5MTkzMDAwMX0.VapewYTe29RzAB_DFcEpBOrN-eN2vII66g4e6c36e-s

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YXdraXh6emJnYmhub29ubnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM1NDAwMSwiZXhwIjoyMDkxOTMwMDAxfQ.3bQxWfCMKvPahxi-CiGj3UuiYT_NSTZywEU85giHg5o

CAL_API_KEY : cal_live_173787e690cb5f2481790e1530d93ee2
CAL_EVENT_TYPE_ID=4912371
CAL_USERNAME=levatenetwork
CAL_EVENT_TYPE_SLUG=televisit
CAL_WEBHOOK_SECRET=l-evatevisits

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeU34AsAAAAAM9yzNFY519qbGQjkKCM7fBPGNDh
RECAPTCHA_SECRET_KEY=6LeU34AsAAAAAGAQnimON9i1g-JyJDq8fDNC7QUr                                                                                                                                                                                                                                                                                                       