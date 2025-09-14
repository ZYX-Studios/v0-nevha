# Database Schema Handoff

Status: Ready for UI wiring
Owner: Engineering
Last Updated: 2025-09-14

## Overview

This document summarizes the current database schema in Supabase (project `gvfpdvcgeizorwozpbdg`) after the Airtable import and normalization. It is the reference for wiring admin interfaces (Homeowners, Members, Vehicles, Stickers, Issues, Announcements) and for any future data migration or QA.

Contents:
- Core domain tables and columns
- Relationships and constraints
- Indexes and RLS notes
- Staging and mapping tables for Airtable
- Current data coverage and known gaps
- Re-run and maintenance scripts

---

## Core Tables

### 1) users
- Columns
  - `id uuid PK`
  - `email varchar(255) UNIQUE NOT NULL`
  - `password_hash varchar(255) NOT NULL` (local environment/dev use)
  - `first_name varchar(100) NOT NULL`
  - `last_name varchar(100) NOT NULL`
  - `phone varchar(20)`
  - `role varchar(20) DEFAULT 'PUBLIC' CHECK (role IN ('PUBLIC','STAFF','ADMIN'))`
  - `is_active boolean DEFAULT true`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- Notes
  - Legacy roles were migrated to PRD roles (`homeowner → PUBLIC`, `staff → STAFF`, `admin → ADMIN`).

### 2) homeowners
- Purpose: Primary entity for a household/address.
- Columns
  - `id uuid PK`
  - `user_id uuid FK users(id) ON DELETE CASCADE` (nullable)
  - `property_address varchar(255) NOT NULL` (composed from Block/Lot/Phase/Street or provided as Full Address)
  - `unit_number varchar(20)`
  - `move_in_date date`
  - `is_owner boolean DEFAULT true`
  - `emergency_contact_name varchar(100)`
  - `emergency_contact_phone varchar(20)`
  - `notes text`
  - PRD-aligned detail fields (populated from Airtable where available):
    - `first_name varchar(100)`
    - `last_name varchar(100)`
    - `middle_initial varchar(10)` (stored as single character when present)
    - `suffix varchar(20)` (e.g., Jr, Sr, II, III)
    - `full_name varchar(200)` (raw or reconstructed full name)
    - `block varchar(50)`
    - `lot varchar(50)`
    - `phase varchar(50)`
    - `street varchar(100)`
    - `contact_number varchar(30)`
    - `length_of_residency integer`
    - `residency_start_date date` (derived; used for dynamic residency length)
    - `email varchar(255)`
    - `facebook_profile varchar(255)`
    - `date_paid date`
    - `amount_paid numeric(12,2)`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`

### 3) members
- Purpose: Household members linked to a homeowner.
- Columns
  - `id uuid PK`
  - `homeowner_id uuid NOT NULL FK homeowners(id) ON DELETE CASCADE`
  - `full_name varchar(150) NOT NULL`
  - `relation varchar(50)`
  - `phone varchar(30)`
  - `email varchar(255)`
  - `is_active boolean DEFAULT true`
  - `created_at timestamptz DEFAULT now()`

### 4) vehicles
- Purpose: Vehicles owned/associated with a homeowner.
- Columns
  - `id uuid PK`
  - `homeowner_id uuid NOT NULL FK homeowners(id) ON DELETE CASCADE`
  - `plate_no varchar(20) NOT NULL`
  - `make varchar(50)`
  - `model varchar(50)`
  - `color varchar(30)`
  - `created_at timestamptz DEFAULT now()`
- Constraints & Indexes
  - `UNIQUE (plate_no)` (supports upsert)
  - `INDEX (homeowner_id)`

### 5) stickers
- Purpose: Normalized car stickers for entry/permit; replaces legacy `car_stickers`.
- Columns
  - `id uuid PK`
  - `homeowner_id uuid NOT NULL FK homeowners(id) ON DELETE CASCADE`
  - `vehicle_id uuid FK vehicles(id) ON DELETE SET NULL`
  - `code varchar(50) NOT NULL` (the sticker number)
  - `status varchar(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','REVOKED'))`
  - `issued_at date DEFAULT current_date`
  - `expires_at date`
  - `notes text`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- Constraints & Indexes
  - `UNIQUE (code)` (supports upsert)
  - `INDEX (homeowner_id)`
  - `INDEX (vehicle_id)`

### 6) announcements
- Columns
  - `id uuid PK`
  - `title varchar(255) NOT NULL`
  - `content text NOT NULL`
  - `author_id uuid FK users(id) ON DELETE SET NULL`
  - `priority varchar(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent'))`
  - `is_published boolean DEFAULT false`
  - `publish_date timestamptz`
  - `expiry_date timestamptz`
  - PRD fields: `slug varchar(255)`, `content_md text`, `published_at timestamptz`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- Indexes
  - `INDEX (is_published, publish_date)`
  - `UNIQUE (slug)` (if used)

### 7) issues
- Columns
  - `id uuid PK`
  - `reporter_id uuid FK users(id) ON DELETE SET NULL`
  - `title varchar(255) NOT NULL`
  - `description text NOT NULL`
  - `category varchar(50) NOT NULL`
  - Legacy checks migrated to PRD enums:
    - `status DEFAULT 'NEW' CHECK (status IN ('NEW','TRIAGED','IN_PROGRESS','NEEDS_INFO','RESOLVED','CLOSED'))`
    - `priority DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3','P4'))`
  - Location and reporter details:
    - `location varchar(255)`, `location_text varchar(255)`
    - `lat double precision`, `lng double precision`
    - `reporter_full_name varchar(150)`, `reporter_phone varchar(30)`, `reporter_email varchar(255)`
    - `reporter_block varchar(50)`, `reporter_lot varchar(50)`, `reporter_phase varchar(50)`, `reporter_street varchar(100)`
    - `suggested_solution text`, `acknowledged boolean DEFAULT false`
  - `assigned_to uuid FK users(id) ON DELETE SET NULL`
  - `resolution_notes text`, `resolved_at timestamptz`
  - `ref_code varchar(20) UNIQUE` (for public status lookup)
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- Indexes
  - `UNIQUE (ref_code)`
  - `INDEX (status)`
  - `INDEX (priority)`

### 8) issue_attachments
- Columns
  - `id uuid PK`
  - `issue_id uuid NOT NULL FK issues(id) ON DELETE CASCADE`
  - `file_name varchar(255) NOT NULL`
  - `file_url varchar(500) NOT NULL`
  - `file_type varchar(50)`
  - `file_size integer`
  - `uploaded_by uuid FK users(id) ON DELETE SET NULL`
  - `created_at timestamptz DEFAULT now()`
- Indexes
  - `INDEX (issue_id)`

### 9) issue_comments
- Columns
  - `id uuid PK`
  - `issue_id uuid NOT NULL FK issues(id) ON DELETE CASCADE`
  - `author_user_id uuid FK users(id) ON DELETE SET NULL`
  - `author_label varchar(100)`
  - `body text NOT NULL`
  - `created_at timestamptz DEFAULT now()`
- Indexes
  - `INDEX (issue_id)`

### 10) departments, issue_departments
- `departments (id uuid PK, name, email, created_at)`
- `issue_departments (issue_id uuid FK, department_id uuid FK, PRIMARY KEY (issue_id, department_id))`

### 11) activity_logs
- `activity_logs (id uuid PK, actor_user_id uuid FK users, action, entity, entity_id, diff_json jsonb, created_at)`
- Indexes: `INDEX (entity, entity_id)`

---

## Staging & Mapping (Airtable)

### 12) airtable_raw_records (staging)
- Purpose: Raw copy of Airtable records for each table in a base.
- Columns
  - `id uuid PK`
  - `base_id text NOT NULL`
  - `table_id text`
  - `table_name text NOT NULL`
  - `record_id text NOT NULL`
  - `created_time timestamptz`
  - `fields jsonb NOT NULL` (raw Airtable fields)
  - `imported_at timestamptz DEFAULT now()`
- Indexes
  - `UNIQUE (base_id, table_name, record_id)` (idempotent upserts)
  - `INDEX (table_name)`

### 13) airtable_record_map (id mapping)
- Purpose: Links Airtable records to normalized target rows for safe, repeatable transforms.
- Columns
  - `base_id text NOT NULL`
  - `table_name text NOT NULL`
  - `record_id text NOT NULL`
  - `target_table text NOT NULL`
  - `target_id uuid NOT NULL`
  - `created_at timestamptz DEFAULT now()`
- Indexes
  - `PRIMARY KEY (base_id, table_name, record_id, target_table)`
  - `INDEX (target_table, target_id)`

---

## Relationships (ER Overview)

- `users (1)` ← `homeowners.user_id` (0..1)
- `homeowners (1)` ← `members.homeowner_id` (N)
- `homeowners (1)` ← `vehicles.homeowner_id` (N)
- `homeowners (1)` ← `stickers.homeowner_id` (N)
- `vehicles (1)` ← `stickers.vehicle_id` (0..1)
- `users (1)` ← `issues.reporter_id` (0..1)
- `users (1)` ← `issues.assigned_to` (0..1)
- `issues (1)` ← `issue_comments.issue_id` (N)
- `users (1)` ← `issue_comments.author_user_id` (0..1)
- `issues (1)` ← `issue_attachments.issue_id` (N)
- `departments (1)` ↔ `issue_departments` ↔ `issues (1)`

---

## Indexes & Constraints (Highlights)

- `vehicles(plate_no) UNIQUE` — required for `ON CONFLICT` upserts.
- `stickers(code) UNIQUE` — required for `ON CONFLICT` upserts.
- `issues(ref_code) UNIQUE` — for public status lookup.
- `users(role)` constrained to `PUBLIC|STAFF|ADMIN`.
- `stickers(status)` constrained to `ACTIVE|EXPIRED|REVOKED`.
- PRD `issues(status, priority)` constraints in place.
- `homeowners(residency_start_date)` indexed for filtering by dynamic residency length.

---

## RLS Notes (High-level)

- `users`: users read/update self; staff/admin manage all.
- `homeowners`: user-owned reads; staff/admin manage all.
- `members`, `vehicles`, `stickers`: user-owned reads; staff/admin manage all.
- `announcements`: public reads on published; staff/admin manage.
- `issues`: public insert (intake flow) with constraints; staff/admin manage.

---

## Current Data Coverage (from Airtable base appnlZqXYs2LegI6I)

- Imported to staging
  - `HOA_TABLE`: 612
  - `STICKER_TABLE 2`: 1054
  - `Household Members`: 1630
- Normalized (approximate, post-transform)
  - `homeowners`: 610
    - enriched fields: first/last/middle, block/lot/phase/street, contact_number, length_of_residency, etc.
  - `vehicles`: 938
  - `stickers`: 1051 (1 sticker without vehicle_id due to missing plate)
  - `members`: 1594
- Known gaps to resolve
  - 3 stickers without resolvable homeowner link (missing/invalid link in Airtable)
  - 27 members without resolvable homeowner link

---

## Re-run & Maintenance

Scripts (see `scripts/airtable/`):
- Staging import (idempotent)
  - `pnpm run airtable:import-all -- appnlZqXYs2LegI6I --verify`
- Transform from staging to normalized (idempotent)
  - `node scripts/airtable/transform-homeowners.js appnlZqXYs2LegI6I`
  - `node scripts/airtable/transform-stickers.js appnlZqXYs2LegI6I`
  - `node scripts/airtable/transform-members.js appnlZqXYs2LegI6I`

Notes
- `airtable_record_map` preserves links between Airtable records and normalized rows; transforms can be safely re-run.
- Legacy `car_stickers` remains in the repo sample schema but is superseded by `vehicles` + `stickers`.
- We can add reporting queries and exception reports (unmatched stickers/members) to assist data cleanup.
- Cleanup applied: normalized NA-like street values (`NA`, `N/A`, `N.A.`, `-`, `none`) to NULL and recomposed `property_address` accordingly.

---

## Next Steps for UI Wiring

- Homeowners
  - List/search w/ `first_name`, `last_name`, `block/lot/phase/street`, `contact_number`.
  - Detail: tabs for `members`, `vehicles`, `stickers`.
- Members
  - Nested under homeowner; CRUD (`full_name`, `relation`).
- Vehicles
  - Nested under homeowner; CRUD (`plate_no`, `make`, `model`, `color`).
- Stickers
  - Issue/renew/revoke flows; `code` unique; optionally attach to vehicle by `plate_no`.
- Issues
  - List with status/priority filters; detail with comments, attachments, department routing.
- Announcements
  - Create/edit markdown; schedule publish with `published_at`; slug management.

This document is the source of truth for the current DB shape; update as schema evolves and as data cleanup completes.
