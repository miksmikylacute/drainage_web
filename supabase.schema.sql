-- ============================================================
-- MIGRATION: Add admins table + foreign keys to existing tables
-- Run this in Supabase SQL Editor on your existing database
-- ============================================================

-- ============================================================
-- 1. CREATE ADMINS TABLE (linked to Supabase auth.users)
-- ============================================================
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'Admin',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. ADD FOREIGN KEY COLUMNS TO EXISTING REPORTS TABLE
-- ============================================================
-- Link each report to the resident who submitted it
alter table public.reports
  add column if not exists submitted_by_id uuid references public.residents(id) on delete set null;

-- Link each report to the admin assigned to handle it
alter table public.reports
  add column if not exists assigned_admin_id uuid references public.admins(id) on delete set null;

-- ============================================================
-- 3. ADD FOREIGN KEY COLUMNS TO EXISTING NOTIFICATIONS TABLE
-- ============================================================
-- Link each notification to a specific report
alter table public.notifications
  add column if not exists report_id uuid references public.reports(id) on delete cascade;

-- Track which admin sent the notification
alter table public.notifications
  add column if not exists sent_by uuid references public.admins(id) on delete set null;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
alter table public.admins enable row level security;
alter table public.reports enable row level security;
alter table public.residents enable row level security;
alter table public.notifications enable row level security;

-- Admins table policies
drop policy if exists "Authenticated admins can manage admins" on public.admins;
create policy "Authenticated admins can manage admins"
on public.admins for all
to authenticated
using (true)
with check (true);

-- Reports table policies
drop policy if exists "Authenticated admins can manage reports" on public.reports;
create policy "Authenticated admins can manage reports"
on public.reports for all
to authenticated
using (true)
with check (true);

-- Residents table policies
drop policy if exists "Authenticated admins can manage residents" on public.residents;
create policy "Authenticated admins can manage residents"
on public.residents for all
to authenticated
using (true)
with check (true);

-- Notifications table policies
drop policy if exists "Authenticated admins can manage notifications" on public.notifications;
create policy "Authenticated admins can manage notifications"
on public.notifications for all
to authenticated
using (true)
with check (true);

-- ============================================================
-- 5. STORAGE BUCKET FOR REPORT PHOTOS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated admins can upload report photos" on storage.objects;
create policy "Authenticated admins can upload report photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'report-photos');

drop policy if exists "Anyone can view report photos" on storage.objects;
create policy "Anyone can view report photos"
on storage.objects for select
to public
using (bucket_id = 'report-photos');
