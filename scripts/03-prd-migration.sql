-- PRD-aligned schema migration
-- Safe to run multiple times (uses IF NOT EXISTS where possible). Adjust names if your platform constrains drops.

begin;

-- 1) New tables --------------------------------------------------------------

-- Household members
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references homeowners(id) on delete cascade,
  full_name varchar(150) not null,
  relation varchar(50),
  phone varchar(30),
  email varchar(255),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Vehicles
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references homeowners(id) on delete cascade,
  plate_no varchar(20) not null,
  make varchar(50),
  model varchar(50),
  color varchar(30),
  created_at timestamptz default now()
);
create unique index if not exists idx_vehicles_plate_no on vehicles(plate_no);
create index if not exists idx_vehicles_homeowner on vehicles(homeowner_id);

-- Stickers (normalized from car_stickers)
create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references homeowners(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  code varchar(50) not null,
  status varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','REVOKED')),
  issued_at date default current_date,
  expires_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_stickers_code on stickers(code);
create index if not exists idx_stickers_homeowner on stickers(homeowner_id);
create index if not exists idx_stickers_vehicle on stickers(vehicle_id);

-- Issue comments
create table if not exists issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  author_user_id uuid null references users(id) on delete set null,
  author_label varchar(100),
  body text not null,
  created_at timestamptz default now()
);
create index if not exists idx_issue_comments_issue on issue_comments(issue_id);

-- Activity logs
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action varchar(100) not null,
  entity varchar(50) not null,
  entity_id uuid not null,
  diff_json jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_activity_logs_entity on activity_logs(entity, entity_id);

-- Departments + mapping for notifications
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  email varchar(255) not null,
  created_at timestamptz default now()
);

create table if not exists issue_departments (
  issue_id uuid not null references issues(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  primary key (issue_id, department_id)
);

-- 2) Announcements PRD fields (keep existing for compatibility) -------------
alter table if exists announcements
  add column if not exists slug varchar(255),
  add column if not exists content_md text,
  add column if not exists published_at timestamptz;
create index if not exists idx_announcements_published_at on announcements(published_at);
create unique index if not exists idx_announcements_slug on announcements(slug);

-- 3) Issues: PRD fields and enums -------------------------------------------
-- Add new fields
alter table if exists issues
  add column if not exists ref_code varchar(20),
  add column if not exists location_text varchar(255),
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists reporter_full_name varchar(150),
  add column if not exists reporter_phone varchar(30),
  add column if not exists reporter_email varchar(255),
  add column if not exists reporter_block varchar(50),
  add column if not exists reporter_lot varchar(50),
  add column if not exists reporter_phase varchar(50),
  add column if not exists reporter_street varchar(100),
  add column if not exists suggested_solution text,
  add column if not exists acknowledged boolean default false;

-- Map legacy values to PRD values (safe if already mapped)
update issues set status = 'NEW' where status = 'open';
update issues set status = 'IN_PROGRESS' where status = 'in_progress';
update issues set status = 'RESOLVED' where status = 'resolved';
update issues set status = 'CLOSED' where status = 'closed';

update issues set priority = 'P1' where priority = 'urgent';
update issues set priority = 'P2' where priority = 'high';
update issues set priority = 'P3' where priority = 'normal';
update issues set priority = 'P4' where priority = 'low';

-- Drop old CHECK constraints if they exist (names may vary by environment)
-- If these DROP statements fail in your environment, rename accordingly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'issues' AND c.conname = 'issues_status_check'
  ) THEN
    ALTER TABLE issues DROP CONSTRAINT issues_status_check;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'issues' AND c.conname = 'issues_priority_check'
  ) THEN
    ALTER TABLE issues DROP CONSTRAINT issues_priority_check;
  END IF;
END$$;

-- Add PRD checks/defaults
alter table issues
  alter column status drop default,
  alter column priority drop default;

alter table issues
  add constraint issues_status_check check (status in ('NEW','TRIAGED','IN_PROGRESS','NEEDS_INFO','RESOLVED','CLOSED')) not valid;
alter table issues validate constraint issues_status_check;

alter table issues
  add constraint issues_priority_check check (priority in ('P1','P2','P3','P4')) not valid;
alter table issues validate constraint issues_priority_check;

alter table issues
  alter column status set default 'NEW',
  alter column priority set default 'P3';

-- Unique ref_code for public tracking
create unique index if not exists idx_issues_ref_code on issues(ref_code);
create index if not exists idx_issues_priority on issues(priority);
create index if not exists idx_issues_status_prd on issues(status);

-- 4) Users role mapping (homeowner -> PUBLIC) --------------------------------
-- Drop any existing role-related CHECK constraints (name-safe dynamic)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', r.conname);
  END LOOP;
END$$;

-- Apply PRD roles; then map values
alter table users
  add constraint users_role_check check (role in ('PUBLIC','STAFF','ADMIN')) not valid;
alter table users alter column role set default 'PUBLIC';

-- Map legacy roles to PRD roles
update users set role = 'PUBLIC' where role = 'homeowner';
update users set role = 'STAFF' where role = 'staff';
update users set role = 'ADMIN' where role = 'admin';

-- Now validate the new constraint after mapping existing values
alter table users validate constraint users_role_check;

commit;

-- Notes:
-- - Existing table `car_stickers` remains for now but is superseded by `vehicles` + `stickers`.
-- - Data migration from `car_stickers` to `vehicles/stickers` can be done in a follow-up script
--   if needed (not included here as sample data is small and dev-oriented).
