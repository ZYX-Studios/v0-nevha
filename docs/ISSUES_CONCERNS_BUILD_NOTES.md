# Issues/Concerns Implementation Plan & Build Notes

Status: In Progress
Owner: Engineering
Last Updated: 2025-09-14

This document captures the current state of our public Issues/Concerns flow and the plan to deliver the end-to-end experience: public reporting, department notification via email, status lookup by reference code, and admin management.

---

## A) Current Inventory (as of 2025-09-14)

- Public Report Form
  - `app/report/page.tsx` – Canonical public reporting form posting to `/api/report`, shows success with `ref_code` and links to `/status/[ref]`. Has offline queue for submissions.
  - `app/report-issue/page.tsx` and `app/report/improved-page.tsx` – Older/alternate forms (not the canonical flow).
  - Home page `app/page.tsx` links to `/report`.

- Public Status Lookup
  - `app/status/[ref]/page.tsx` – SSR page calling RPC `get_issue_public` and rendering safe fields by `ref_code`.
  - `app/api/status/route.ts` – `GET /api/status?ref=` calling RPC `get_issue_status`.

- Public API
  - `app/api/report/route.ts` – `POST /api/report`: validates, generates `ref_code` in code, inserts to `issues` (`status='NEW'`, `acknowledged=true` provided by client). Currently does not link departments or send email.

- Database & RLS (verified via MCP against project `gvfpdvcgeizorwozpbdg`)
  - `issues` – PRD-aligned columns incl. `priority` (P1–P4), `status` (NEW, TRIAGED, IN_PROGRESS, NEEDS_INFO, RESOLVED, CLOSED), `ref_code` (UNIQUE), reporter fields, location, etc.
  - `departments` – name, email, `is_active`; public may `SELECT` active rows (RLS present).
  - `issue_departments` – links issues to departments; `UNIQUE (issue_id, department_id)`, supports `is_primary`.
  - `issue_comments` / `issue_attachments` – staff/admin manage (RLS present), public comments can be represented by `is_internal=false`.
  - Notable: both `ref_code` and `reference_code` exist and are indexed (we standardize on `ref_code`).

---

## B) Product Decisions & Assumptions

- Department Selection
  - The "Issue Related To" field (category) is the department selection.
  - Implementation: map the submitted `category` to a row in `departments` by `name` (case-insensitive) when linking in `issue_departments`.
  - If no exact match is found, we can optionally define a fallback (e.g., a "General" department) or skip linking and log an exception for later cleanup.

- Reference Code
  - Standardize on `ref_code` everywhere in code and UI.
  - Keep `reference_code` synchronized for compatibility (set by DB trigger) until fully deprecated.

- Public RPC
  - Consolidate on a single SECURITY DEFINER RPC `get_issue_status(ref text)` that returns a safe subset + non-internal comments. Update `/status/[ref]` to use this RPC too.

- Priority & Status
  - Enforce PRD values: `priority ∈ {P1,P2,P3,P4}`, `status ∈ {NEW,TRIAGED,IN_PROGRESS,NEEDS_INFO,RESOLVED,CLOSED}`.
  - If the UI sends legacy labels, map them server-side per the handoff (urgent→P1, high→P2, normal→P3, low→P4).

---

## C) Database Tasks (Migrations)

1) Generate Reference Code in DB (recommended)
- Create `generate_ref_code()` function to produce short unique codes (e.g., `REF-ABCDEFGH` or `NVH-25-ABC123`).
- Add `BEFORE INSERT` trigger on `issues` to set `ref_code` when null and also set `reference_code` for legacy compatibility.

2) Public Status RPC (consolidation)
- Create/standardize `get_issue_status(ref text)` SECURITY DEFINER that returns a safe subset:
  - `ref_code, status, priority, category, title, description (if acceptable), created_at, updated_at`
  - Optionally include non-internal comments: join `issue_comments` where `is_internal=false`.

3) Optional
- If department names differ from categories, add a lookup table or view `category_department_map(category text, department_id uuid)` to control mappings.

---

## D) API Changes

- `POST /api/report` (`app/api/report/route.ts`)
  - Validate payload (zod) and normalize NA-like values.
  - Ensure `acknowledged=true` (kept from UI to satisfy RLS).
  - Insert `issues` row (priority mapped to P1–P4; `status='NEW'`).
  - Map `category`→`departments.id` by name (case-insensitive) and insert into `issue_departments` with `is_primary=true`.
  - Send Resend email to department’s `email` with issue details and admin link.
  - Return `{ ref_code }`.

- `GET /api/status?ref=` (`app/api/status/route.ts`)
  - Keep but consolidate to RPC `get_issue_status`.

- Note: `/status/[ref]` SSR page will be updated to call the same RPC for consistency.

---

## E) Notifications (Resend)

- Setup
  - Add `.env.example` `RESEND_API_KEY`.
  - `lib/resend.ts` – instantiate client.

- Template (simple transactional)
  - Subject: `New Issue Reported: {title} ({ref_code})`
  - Body: `ref_code, title, category (department), priority, description, reporter contact, submitted at, link to Admin Issue Detail`.

- Triggers
  - On issue creation (NEW).
  - Optional later: on status changes and new public comments.

---

## F) Public UI

- `app/report/page.tsx` (canonical)
  - Keep current form. "Issue Related To" is the department selector via `category`.
  - Success screen shows `ref_code` and links to `/status/[ref]`.

- `app/status/[ref]/page.tsx`
  - Standardize to use `get_issue_status` RPC.
  - Render safe subset only; include a public comment list if desired (non-internal only).

- Clean-up
  - Consider redirecting `app/report-issue/` and `app/report/improved-page.tsx` to `/report` or remove later.

---

## G) Admin UI

- `app/admin/issues/`
  - List: real data wiring, filters (status, priority, department, created), ref_code column.
  - Detail page (new): overview + status transitions (NEW→…→CLOSED), assignment, department watchers, public/private comments, attachments, and activity log.

---

## G.1) Department Portal (E2)

Purpose: lightweight password-gated portal for non-admin department staff to update issues assigned to their department.

- DB Additions
  - `departments.portal_password_hash text`, `departments.portal_password_updated_at timestamptz`
  - `issue_status_updates.author_department_id uuid references departments(id)`, `issue_status_updates.source text in ('admin_portal','dept_portal','email_link','slack')`
  - Index: `issue_departments_department_id_idx` for faster filtering

- API (scoped by dept cookie)
  - `POST /api/admin/departments/[id]/portal-password` — set/reset per-dept portal password (admin only)
  - `GET /api/dept/departments` — list active departments (login screen)
  - `POST /api/dept/session/login|logout`, `GET /api/dept/me`
  - `GET /api/dept/issues` — list issues linked via `issue_departments` to the dept
  - `GET /api/dept/issues/[id]` — detail view, dept-scoped
  - `GET|POST /api/dept/issues/[id]/updates` — status timeline and update action; updates set `author_label`, `author_department_id`, `source='dept_portal'`

- UI
  - `/dept/login` — select department, enter password, provide display name (used as `author_label`)
  - `/dept/issues` — list with status filter
  - `/dept/issues/[id]` — details, timeline, and two actions: Add Update (In Progress), Mark Resolved/Reopen

- Security
  - Cookie: `dept_session` signed with `DEPT_PORTAL_SECRET`, httpOnly/secure/sameSite=strict, TTL 7 days
  - Password rotation invalidates existing sessions via `portal_password_updated_at`
  - Rate limiting for login is recommended (pending)

---

## H) Security & Validation

- RLS
  - Keep public INSERT to `issues` constrained (`reporter_id IS NULL`, `status='NEW'`, `acknowledged=TRUE`).
  - Staff/Admin manage `issues`, `issue_comments`, `issue_attachments`, `issue_departments`.

- Validation
  - Use zod on both client (`/report`) and server (`/api/report`).
  - Sanitize NA-like placeholders before insert.

- Abuse protection (optional): rate limiting and/or CAPTCHA on `/api/report`.

---

## I) Rollout Plan

1) DB & RPC
- Add `generate_ref_code()` + trigger on `issues`.
- Create/standardize `get_issue_status(ref)` RPC.

2) API
- Update `/api/report` to link department and send Resend email.

3) UI
- Keep `/report` canonical; confirm success and status pages.
- Update `/status/[ref]` to call the unified RPC.

4) Admin
- Wire `/admin/issues` list to DB; add detail page with status transitions, comments, attachments, logs.

5) Hardening
- Rate limiting/CAPTCHA; unit/integration tests for RLS and flows.

---

## J) Task Checklist

- [ ] DB: `generate_ref_code()` and BEFORE INSERT trigger on `issues` (also set `reference_code`).
- [ ] DB: `get_issue_status(ref)` SECURITY DEFINER returning safe subset (+ public comments optional).
- [ ] API: `/api/report` validates, inserts, maps category→department, creates `issue_departments` row.
- [ ] Email: Resend wiring + basic HTML template.
- [ ] Public: `/report` (confirm) and `/status/[ref]` unified RPC usage.
- [ ] Admin: `/admin/issues` list wiring and detail page with transitions/comments/attachments/logs.
- [ ] Hardening: rate limiting/CAPTCHA, zod validation, tests.

References
- `docs/DB_SCHEMA_HANDOFF.md` (project `gvfpdvcgeizorwozpbdg`)
- `docs/ADMIN_PORTAL_HANDOFF.md` (statuses & priorities mapping; notifications plan)
