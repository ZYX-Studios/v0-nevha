# Admin Portal Implementation Plan & Handoff

Status: In Progress
Owner: Engineering
Last Updated: 2025-09-14

## 1) Decisions and Scope

- Auth: Supabase Auth for sessions and role-gating. Keep `lib/supabase/*` client/middleware. Replace local mock `use-auth` with Supabase session checks.
- Data source: Supabase as primary. We will be able to pull/import from Airtable later via a repo layer.
- Migration: Adopt PRD-normalized schema. Migrate and/or extend current schema to match.
- Issues workflow/statuses: Use PRD statuses and priorities (best for triage flows and reporting):
  - Statuses: `NEW → TRIAGED → IN_PROGRESS → NEEDS_INFO → RESOLVED → CLOSED`
  - Priorities: `P1 (critical), P2 (high), P3 (normal), P4 (low)`
- Mapping from current data to PRD:
  - Status: `open → NEW`, `in_progress → IN_PROGRESS`, `resolved → RESOLVED`, `closed → CLOSED`
  - Priority: `urgent → P1`, `high → P2`, `normal → P3`, `low → P4`

## 2) Architecture Overview

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion
- Supabase Postgres for DB + RLS; Supabase Storage for files
- Server Actions for admin mutations with Supabase server client (`lib/supabase/server.ts`)
- Middleware (`middleware.ts` + `lib/supabase/middleware.ts`) protects `/admin`, `/dashboard`, and `/api/admin/*`
- Public API endpoints remain for reporting and reading announcements/status

## 3) Database: Target Schema (PRD-aligned)

Note: This is a high-level outline of DDL; actual migration will be applied as SQL migrations.

### 3.1 Users
- Table: `users (id uuid PK, email, name split first/last or full, phone, role enum['PUBLIC','STAFF','ADMIN'], created_at)`
- Migration: Convert existing `role` values (`homeowner` → `PUBLIC`) and switch check to explicit enum or enum-like check.

### 3.2 Homeowners and Household Members
- `homeowners (id, user_id FK users, full_name, address_line, phase_block_lot, phone, email, created_at)`
- `members (id, homeowner_id FK, full_name, relation, phone, email, is_active)`

### 3.3 Vehicles and Stickers
- `vehicles (id, homeowner_id FK, plate_no, make, model, color)`
- `stickers (id, homeowner_id FK, vehicle_id FK, code UNIQUE, status ENUM['ACTIVE','EXPIRED','REVOKED'], issued_at, expires_at, notes)`
- Migration: Deprecate/replace `car_stickers` by normalizing into `vehicles` + `stickers` (data migration where possible).

### 3.4 Announcements
- `announcements (id, title, slug, content_md, published_at, created_by)`
- Keep compatibility with current public API that uses: `content`, `is_published`, `publish_date`, `expiry_date` (we can maintain dual fields during transition).

### 3.5 Issues, Comments, Attachments, Activity Logs
- `issues (id, ref_code UNIQUE, title, description, category, priority ENUM['P1','P2','P3','P4'], status ENUM['NEW','TRIAGED','IN_PROGRESS','NEEDS_INFO','RESOLVED','CLOSED'], location_text, lat, lng, reporter_name, reporter_email, reporter_phone, created_at, updated_at, assigned_to FK users, reporter_block, reporter_lot, reporter_phase, reporter_street, suggested_solution, acknowledged BOOLEAN)`
- `issue_attachments (id, issue_id FK, file_url, file_type, created_at, uploaded_by FK users)`
- `issue_comments (id, issue_id FK, author_user_id FK NULLABLE, author_label, body, created_at)`
- `activity_logs (id, actor_user_id, action, entity, entity_id, diff_json, created_at)`

### 3.6 Departments & Notifications
- `departments (id, name, email)`
- `issue_departments (issue_id FK, department_id FK)` OR a watcher table. Used for notification routing.

### 3.7 Indexes (non-exhaustive)
- `issues (ref_code UNIQUE, status, priority)`
- `homeowners (user_id)`
- `vehicles (plate_no)`
- `stickers (code UNIQUE, homeowner_id, vehicle_id)`

## 4) RLS Policies (Plan)

Important: RLS must allow public to insert issues via `/api/report` while keeping all admin operations role-gated.

- `users`: staff/admin manage; users can read/update own.
- `homeowners`: homeowners can view their own rows; staff/admin can manage all.
- `members`: homeowners can view rows under their homeowner_id; staff/admin manage all.
- `vehicles`, `stickers`: homeowners view own; staff/admin manage all.
- `announcements`: `SELECT` for all where `(is_published AND publish_date <= now AND (expiry is null or > now))`; staff/admin manage all.
- `issues`:
  - Public `INSERT` allowed with `WITH CHECK (reporter_id IS NULL AND status = 'NEW' AND acknowledged IS TRUE)`; default priority P3 when not provided.
  - Staff/Admin: full `SELECT/INSERT/UPDATE/DELETE`.
  - Reporter readback strategy (status lookup by `ref_code`): expose via a SECURITY DEFINER RPC or a restricted view returning only public fields; implement policy to allow `SELECT` by `ref_code` input (not by user id).
- `issue_attachments`, `issue_comments`:
  - Staff/Admin manage; optionally allow reporter to add during initial submission in future iterations.
- `activity_logs`: staff/admin read; inserts happen from server actions.

Note: We will implement an RPC `get_issue_status(ref text)` with `SECURITY DEFINER` to return a safe subset of fields for public status lookup.

## 5) API Endpoints and Server Actions

- Public
  - `GET /api/announcements`: already implemented; later migrate to read `published_at/slug/content_md` as needed.
  - `POST /api/report`: already implemented; after migration, will write PRD fields, generate `ref_code`, default `status = 'NEW'` and priority mapping to P1–P4.
  - `GET /api/status?ref=`: implement using RPC to return limited fields by `ref_code`.

- Admin (role-gated via middleware + server actions)
  - Homeowners: list/search/create/update/delete; CSV import endpoint/server action.
  - Members: nested under homeowner detail; CRUD.
  - Vehicles: nested under homeowner; CRUD.
  - Stickers: issue/renew/revoke; generate `code` and QR; batch print page.
  - Issues: list w/ filters; status transitions; assignment; comments; attachments; audit logs.
  - Announcements: create/edit markdown, schedule publish (`published_at`) with draft/publish flow.

## 6) Admin UI Pages (Deliverables)

- `app/admin/homeowners/`
  - `page.tsx`: table with search/sort/pagination; create button.
  - `[id]/page.tsx`: detail view with members, vehicles, stickers tabs; inline CRUD.
  - `import/page.tsx`: CSV import wizard (client-parse + server action).

- `app/admin/stickers/`
  - `page.tsx`: global list of stickers; filters (status, expires soon); actions (renew, revoke).
  - `print/page.tsx`: A4 grid batch print with QR codes.

- `app/admin/issues/` (update existing)
  - Replace local mock with Supabase data.
  - Update filters to PRD statuses (NEW, TRIAGED, IN_PROGRESS, NEEDS_INFO, RESOLVED, CLOSED) and priorities (P1–P4).
  - Add assignment, comments feed, attachments, and activity log drawer.

- `app/admin/announcements/` (expand existing)
  - New/Edit forms with markdown editor (`content_md`), slug, schedule `published_at`, and optional expiry.

## 7) Notifications Strategy

- Provider: Resend (or compatible). Add `.env` key and lightweight client.
- Trigger points: On `NEW` issue creation, email department(s) based on category mapping or `issue_departments` rows. Optionally on status changes.
- Templates: simple transactional HTML; include `ref_code`, title, category, priority, and links to admin.

## 8) Seeds and Developer Ergonomics

- Update `scripts/02-seed-data.sql` to generate:
  - ~25 homeowners with members & vehicles
  - ~15 active stickers
  - ~40 issues distributed across statuses with comments & attachments
  - ~12 announcements
- Include `03-migrations-prd.sql` for DDL changes and indexes; `04-rls-policies.sql` for RLS; `05-rpc-status.sql` for status RPC/view.
- Add `.env.example` with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `ADMIN_ACCESS_KEY` (optional), plus any storage bucket names.
- README: setup steps, migrations run order, how to run locally and seed.

## 9) Rollout Plan (Phases)

- Phase 0: Foundation
  - Author and apply migrations to align with PRD (tables, enums, fields, indexes).
  - Update RLS to enable public issue inserts and admin/staff manage policies.

- Phase 1: Auth Unification
  - Replace local `hooks/use-auth.tsx`/`protected-route.tsx` logic with Supabase session-driven checks.
  - Keep `middleware.ts` protections as source of truth.

- Phase 2: Admin Modules
  - Homeowners CRUD + Members nested CRUD.
  - Vehicles + Stickers (issue/renew/revoke, QR, print page).
  - Issues tracker enhancements (PRD statuses, priorities P1–P4, assignment, comments, attachments, audit log).
  - Announcements CMS (markdown, scheduling).

- Phase 3: Notifications
  - Integrate Resend, create templates, and wire triggers.

- Phase 4: Seeds, QA, Docs
  - Refresh seeds; add tests (role guards, validations, component tests); update README.

## 10) Status/Priority Mapping Reference

- Status mapping (legacy → PRD):
  - `open → NEW`
  - `in_progress → IN_PROGRESS`
  - `resolved → RESOLVED`
  - `closed → CLOSED`
  - Introduce `TRIAGED` (post-intake) and `NEEDS_INFO` (request info).

- Priority mapping (legacy → PRD):
  - `urgent → P1`
  - `high → P2`
  - `normal → P3`
  - `low → P4`

## 11) Implementation Notes and Conventions

- Use Server Actions colocated with pages for admin CRUD; keep all Supabase writes through server client.
- Add audit log entries for key actions (issue status changes, assignment changes, sticker status changes, announcement publish events).
- Prefer typed accessors in a `lib/repo/*` layer to isolate DB (future Airtable swap).
- File storage: Supabase Storage bucket `issue-attachments` with signed uploads from server actions.

## 12) Open Questions / Future Enhancements

- Public status lookup security: implement RPC with SECURITY DEFINER returning a safe subset only; consider rate limiting.
- CSV import validation and partial commit UX.
- Dashboard metrics and SLA widgets for `/admin` landing.
- Accessibility and e2e tests for admin flows.

## 13) Handoff – 2025-09-14 Admin Homeowners & Stickers Refinements

This section summarizes the concrete changes shipped to the Admin Homeowners list and detail experience, associated API routes, and schema updates.

### A. Summary of Changes

- UI
  - Homeowners list (`app/admin/homeowners/page.tsx`)
    - Removed columns: Contact Name, Contact Phone.
    - Added column: Contact Number (uses `homeowners.contact_number`).
    - Name now formats suffix when available (e.g., `Jr.`, `Sr.`, `III`).
    - CSV export columns now: Name, Address, Ownership, Move-in, Contact Number, Email.
    - Search placeholder simplified to exclude removed fields.
  - Homeowner create (dialog in `app/admin/homeowners/page.tsx`)
    - Added `Suffix` input (optional). Accepted values include `Jr.`, `Sr.`, roman numerals (e.g., `III`) or ordinals (e.g., `2nd`).
  - Homeowner detail (`app/admin/homeowners/[id]/page.tsx`)
    - Header shows a composed address (Block, Lot, Phase, Street) and a subtitle with full name and contact number. Owner/Renter badge retained. Move-in and emergency contacts shown.
    - Unified Vehicles and Stickers under a single Stickers tab.
    - Stickers list shows: code + status, plate/make/model/color, category, Paid/Released (Date Issued), Amount Paid, Notes.
    - “Add Sticker” form: Sticker No, Plate No, Maker, Model, Amount Paid, Date Issued (with subtle “Set today” link), Category dropdown, Notes. Removed Expiry Date and Sticker Released selector from the UI per latest decision.

- API
  - Homeowners list/search (`app/api/admin/homeowners/route.ts`)
    - Server filters for unit/paid/amount removed (aligned with UI). Address is composed on server when full address is not provided.
  - Homeowner detail (`app/api/admin/homeowners/[id]/route.ts`)
    - Returns enriched fields (block/lot/phase/street/contact_number, etc.).
  - Members (`app/api/admin/homeowners/[id]/members/route.ts`) and Vehicles (`app/api/admin/homeowners/[id]/vehicles/route.ts`)
    - Unchanged semantics; vehicles are still available but now consumed via stickers join for display.
  - Stickers (`app/api/admin/homeowners/[id]/stickers/route.ts`)
    - GET: Uses `issued_at` ordering; joins `vehicles` to return plate/make/model/color/category. If PRD `stickers` is missing or incompatible, falls back to legacy `car_stickers` (ordered by `issue_date`). Avoids referencing `created_at` to prevent schema mismatch errors.
    - POST: Accepts `code`, `vehiclePlateNo`, `vehicleMake`, `vehicleModel`, `vehicleCategory`, `issuedAt`, `amountPaid`, `notes`. Upserts vehicle by plate and sticker by code. Defaults status to ACTIVE server-side. Falls back to `car_stickers` if PRD stickers table is absent.
  - Homeowners create (`POST /api/admin/homeowners`)
    - Accepts `suffix` and composes `full_name` server-side from `firstName`, `lastName`, and `suffix`.
    - Sanitizes NA-like street values before persisting.
    - Computes and stores `residency_start_date` from `moveInDate` or derived from `lengthOfResidency`.

- Schema (applied via Supabase migration)
  - Added `stickers.amount_paid numeric(12,2)`.
  - Added `vehicles.category varchar(30)`.
  - Legacy table `car_stickers` remains for compatibility; stickers API auto-falls back when needed.

- Types (`lib/types.ts`)
  - `Sticker`: added `amountPaid`, and optional display joins `vehiclePlateNo`, `vehicleMake`, `vehicleModel`, `vehicleColor`, `vehicleCategory`.
  - `Vehicle`: added optional `category`.

### B. Design Decisions

- Address composition happens on the server from Phase/Block/Lot/Street for consistency.
- Homeowners list focuses on the most relevant contact field: Contact Number.
- Vehicles are displayed within Stickers; we track stickers with vehicle metadata. No separate vehicles tab in the UI.
- Date Issued is treated as Date Paid. Expiry and UI-released toggle removed for simplicity.
- Stickers API is resilient across environments by falling back to `car_stickers`.

### C. How to Test

1) Homeowners list
   - Navigate to `/admin/homeowners`
   - Verify columns: Name, Address, Ownership, Move-in, Contact Number, Actions.
   - Use search/filters; export CSV and confirm column set.

2) Create homeowner
   - Click New Homeowner; form requires either Street OR both Block and Lot.
   - Submit; server composes `property_address` when needed.
   - If you enter a Suffix (e.g., `Jr.`), verify the list shows the suffix in the Name and that CSV export includes it.

3) Homeowner detail
   - Open `/admin/homeowners/:id`.
   - Overview shows composed address and contact line.
   - Members tab CRUD works.
   - Stickers tab shows list and “Add Sticker”. Try adding a sticker using Plate/Maker/Model/Category/Amount/Date Issued/Notes.
   - Confirm list shows vehicle details, Paid/Released, Amount Paid.

4) Stickers API fallback
   - If PRD `stickers` exists, data writes/reads there.
   - If not, API uses `car_stickers` without breaking the UI (fields limited by legacy schema).

### D. Known Limitations / Notes

- Legacy `car_stickers` does not store `amount_paid` or `notes`; these will only persist when PRD `stickers` is present.
- Status badge is still shown in the stickers list for visibility, but there is no “released” toggle in the form. We can remove the badge if desired.
- Created-at ordering is intentionally not used for stickers to avoid environment schema differences.

### E. Follow-ups (Optional)

- Remove the status badge in stickers list if we want a more minimal view.
- Add auto-default for Date Issued to today when opening the form (we currently provide a subtle “Set today”).
- Global Stickers list page and batch print are still planned features per Section 6.
- When PRD `stickers` is fully adopted, consider removing the legacy fallback and cleaning up code paths.


This document is the single source of truth for the Admin Portal work. Update it as phases complete and as decisions evolve.
