-- RLS policies aligning with PRD roles and public reporting

begin;

-- Ensure RLS is enabled on new tables
alter table if exists members enable row level security;
alter table if exists vehicles enable row level security;
alter table if exists stickers enable row level security;
alter table if exists issue_comments enable row level security;
alter table if exists activity_logs enable row level security;
alter table if exists departments enable row level security;
alter table if exists issue_departments enable row level security;

-- Drop legacy policies from 01 script to avoid conflicts ----------------------
-- users
drop policy if exists "Users can view their own profile" on users;
drop policy if exists "Users can update their own profile" on users;
-- homeowners
drop policy if exists "Homeowners can view their own data" on homeowners;
drop policy if exists "Homeowners can update their own data" on homeowners;
drop policy if exists "Admins can view all homeowner data" on homeowners;
-- car_stickers (legacy)
drop policy if exists "Homeowners can view their own car stickers" on car_stickers;
drop policy if exists "Homeowners can manage their own car stickers" on car_stickers;
-- announcements
drop policy if exists "Everyone can view published announcements" on announcements;
drop policy if exists "Admins can manage all announcements" on announcements;
-- issues
drop policy if exists "Users can view their own issues" on issues;
drop policy if exists "Users can create issues" on issues;
drop policy if exists "Users can update their own issues" on issues;
drop policy if exists "Admins can view and manage all issues" on issues;
-- issue_attachments
drop policy if exists "Users can view attachments for their issues" on issue_attachments;
drop policy if exists "Users can add attachments to their issues" on issue_attachments;

-- USERS ----------------------------------------------------------------------
create policy "Users can view their own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on users
  for update using (auth.uid() = id);

create policy "Staff can view all users" on users
  for select using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF')
    )
  );

-- HOMEOWNERS -----------------------------------------------------------------
create policy "Homeowners can view their own data" on homeowners
  for select using (user_id = auth.uid());

create policy "Homeowners can update their own data" on homeowners
  for update using (user_id = auth.uid());

create policy "Staff/Admin can manage all homeowners" on homeowners
  for all using (
    exists (
      select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF')
    )
  );

-- MEMBERS --------------------------------------------------------------------
create policy "Homeowners view their members" on members
  for select using (
    homeowner_id in (select id from homeowners where user_id = auth.uid())
  );

create policy "Staff/Admin manage members" on members
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- VEHICLES -------------------------------------------------------------------
create policy "Homeowners view their vehicles" on vehicles
  for select using (
    homeowner_id in (select id from homeowners where user_id = auth.uid())
  );

create policy "Staff/Admin manage vehicles" on vehicles
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- STICKERS -------------------------------------------------------------------
create policy "Homeowners view their stickers" on stickers
  for select using (
    homeowner_id in (select id from homeowners where user_id = auth.uid())
  );

create policy "Staff/Admin manage stickers" on stickers
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- ANNOUNCEMENTS ---------------------------------------------------------------
create policy "Everyone can view published announcements" on announcements
  for select using (
    (is_published = true and (publish_date is null or publish_date <= now()) and (expiry_date is null or expiry_date > now()))
    or
    (published_at is not null and published_at <= now())
  );

create policy "Staff/Admin manage announcements" on announcements
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- ISSUES ---------------------------------------------------------------------
-- Public can create NEW issues (anon or authenticated public)
create policy "Public can create NEW issues" on issues
  for insert to public with check (
    reporter_id is null
    and status = 'NEW'
    and acknowledged is true
  );

-- Staff/Admin full access
create policy "Staff/Admin manage issues" on issues
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- Reporter can view own issues if logged in (optional)
create policy "Reporter can view own issues" on issues
  for select using (reporter_id = auth.uid());

-- ISSUE ATTACHMENTS -----------------------------------------------------------
create policy "Staff/Admin manage attachments" on issue_attachments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- ISSUE COMMENTS --------------------------------------------------------------
create policy "Staff/Admin manage comments" on issue_comments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- ACTIVITY LOGS --------------------------------------------------------------
create policy "Staff/Admin view activity logs" on activity_logs
  for select using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

-- DEPARTMENTS & ISSUE_DEPARTMENTS --------------------------------------------
create policy "Staff/Admin manage departments" on departments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

create policy "Staff/Admin manage issue_departments" on issue_departments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('ADMIN','STAFF'))
  );

commit;
