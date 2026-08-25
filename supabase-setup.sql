-- ============================================================
-- Run this whole file once in Supabase: SQL Editor -> New query
-- ============================================================

-- 1. COURSES TABLE
-- Holds your real, verified prospectus data. Public can read
-- (students need to browse/match), only you (logged in) can
-- add/edit/delete.
create table courses (
  id uuid primary key default gen_random_uuid(),
  university text not null,
  faculty text not null,
  course_name text not null,
  min_score numeric not null,
  requirements text,
  created_at timestamp with time zone default now()
);

alter table courses enable row level security;

create policy "Public can read courses"
  on courses for select
  using (true);

create policy "Only admins can manage courses"
  on courses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- 2. STUDENTS TABLE
-- Holds applicant info + next of kin + document links + status.
-- Anyone can SUBMIT (insert) an application (no login required
-- for students), but only you (logged in) can VIEW or UPDATE
-- the list -- this keeps student personal info private.
create table students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  id_number text not null,
  phone text not null,
  email text,
  next_of_kin_name text,
  next_of_kin_relationship text,
  next_of_kin_phone text,
  university text,
  aps_score numeric,
  matched_courses jsonb,
  id_document_url text,
  results_document_url text,
  proof_of_payment_url text,
  status text default 'Pending',
  created_at timestamp with time zone default now()
);

alter table students enable row level security;

create policy "Anyone can submit an application"
  on students for insert
  with check (true);

create policy "Only admins can view applications"
  on students for select
  using (auth.role() = 'authenticated');

create policy "Only admins can update applications"
  on students for update
  using (auth.role() = 'authenticated');


-- ============================================================
-- PAYMENTS TABLE (PayFast integration)
-- ============================================================
-- Tracks each payment attempt. Students can create a PENDING row
-- and read status back, but only the server-side Netlify Function
-- (using the secret service_role key, which bypasses RLS) can ever
-- mark a payment COMPLETE. No public update policy exists here on
-- purpose -- this stops anyone from editing the browser request to
-- fake a successful payment.
create table payments (
  id uuid primary key default gen_random_uuid(),
  m_payment_id text unique not null,
  pf_payment_id text,
  amount numeric not null,
  status text default 'PENDING', -- PENDING | COMPLETE | CANCELLED
  matched_courses jsonb,
  aps_score numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table payments enable row level security;

create policy "Anyone can create a pending payment"
  on payments for insert
  with check (status = 'PENDING');

create policy "Anyone can check a payment's status"
  on payments for select
  using (true);



-- 4. STORAGE POLICIES for the 'student-documents' bucket
-- (Run these too -- students upload without logging in, but only
-- you can view/download the actual documents afterward.)
create policy "Anyone can upload a document"
  on storage.objects for insert
  with check (bucket_id = 'student-documents');

create policy "Only admins can view documents"
  on storage.objects for select
  using (bucket_id = 'student-documents' and auth.role() = 'authenticated');
