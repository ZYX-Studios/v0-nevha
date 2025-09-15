# Issues Status Updates — Handoff

This handoff documents the simplified status updates model and the related API/UI changes for Admin Issues management.

## Summary
- We simplified issues tracking to “issues have status updates.”
- A new table `issue_status_updates` stores the history. The `issues` table holds the current status only.
- Admin UI now uses two actions:
  - Add Update (In Progress)
  - Mark Resolved / Reopen
- Status updates timeline appears on the Issue Details page with notes prominently displayed.
- Address and reporter information are visible both in list and details views.
- Activity logs and the older “resolution” fields are no longer used by the UI (still present in DB for backward compatibility).

## Data Model
- New table: `public.issue_status_updates`
  - id uuid PK default gen_random_uuid()
  - issue_id uuid NOT NULL references public.issues(id) on delete cascade
  - status text NOT NULL check in ('NEW','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED')
  - notes text NULL
  - author_label text NULL
  - created_at timestamptz NOT NULL default now()
  - index: `issue_status_updates_issue_id_created_at_idx` on (issue_id, created_at)

Migration applied (via Supabase MCP): `create_issue_status_updates_20250914`.

## Status Mapping
UI status ↔ DB status
- open ↔ TRIAGED (DB may also contain NEW/NEEDS_INFO which map to open)
- in_progress ↔ IN_PROGRESS
- resolved ↔ RESOLVED
- closed ↔ CLOSED

Defaults
- Posting an update without a status sets the issue to `in_progress` (DB: IN_PROGRESS).

## API Endpoints
All admin routes use the Supabase service role client and bypass RLS.

- GET `/api/admin/issues`
  - Returns paginated list of issues (no pagination yet; latest first).
  - Fields (selected/mapped):
    - id, ref_code, title, description, category, priority (mapped P1–P4 → urgent/high/normal/low)
    - status (DB → open/in_progress/resolved/closed)
    - createdAt, updatedAt
    - location (from `issues.location_text`)
    - reporterPhase/block/lot/street (from reporter_* columns)
    - reporterFullName, reporterEmail
    - resolvedAt, resolutionNotes (legacy, not used by UI now)
  - File: `app/api/admin/issues/route.ts`

- GET `/api/admin/issues/[id]`
  - Returns enriched single issue for detail view, including department name and reporter address fields.
  - File: `app/api/admin/issues/[id]/route.ts`

- GET `/api/admin/issues/[id]/updates`
  - Returns newest-first list of status update lines from `issue_status_updates`.
  - Maps DB status back to UI status.
  - File: `app/api/admin/issues/[id]/updates/route.ts`

- POST `/api/admin/issues/[id]/updates`
  - Body: `{ status?: 'open'|'in_progress'|'resolved'|'closed', notes?: string, author_label?: string }`
  - Behavior:
    - If `status` is omitted, defaults to `in_progress`.
    - Updates `issues.status` (current state).
    - Inserts a row into `issue_status_updates` with mapped DB status and notes.
  - File: `app/api/admin/issues/[id]/updates/route.ts`

- PATCH `/api/admin/issues/[id]/status` (kept for compatibility)
  - Simplified to do the same as POST /updates (update `issues.status` + insert into `issue_status_updates`).
  - File: `app/api/admin/issues/[id]/status/route.ts`

- PATCH `/api/admin/issues/status` (fallback route)
  - Same simplified behavior as above.
  - File: `app/api/admin/issues/status/route.ts`

Deprecated/Unused by UI
- GET `/api/admin/issues/[id]/activity` (activity_logs based) is no longer used.

## UI Changes

### Admin Issues List — `/admin/issues`
- Card shows:
  - Priority, Status (badge), Category, Created date.
  - Title.
  - Reporter (full name or email; falls back to Anonymous).
  - Description.
  - Address line labeled as: `Address: Phase X • Block Y • Lot Z • Street W • [location_text if present]`.
- Update Status dialog simplified:
  - Notes (optional)
  - Add Update (In Progress)
  - Mark Resolved / Reopen (depending on current status)
- Button: View Details → `/admin/issues/[id]`.
- File: `app/admin/issues/page.tsx`

### Issue Details — `/admin/issues/[id]`
- Header shows:
  - Status pill reflecting the latest update (not just the snapshot).
  - Priority, Category, Dept (if linked), Created timestamp.
- Body shows:
  - Description.
  - Address line (formatted/labeled as above).
  - Reporter Name and Email (if present).
- Update Status card:
  - Notes textbox (optional)
  - Buttons: Add Update (In Progress), Mark Resolved / Reopen
  - Optimistic update: pill and list reflect changes immediately; then full reload refreshes from API.
- Status Updates list:
  - Newest first.
  - Notes are prominent.
  - Meta line (date — set to <status> by <author>) is small and muted.
  - Clear delineation between entries (`border` + `divide-y`).
- File: `app/admin/issues/[id]/page.tsx`

## Notifications
- Sonner `Toaster` is mounted globally in `app/layout.tsx`.
- Success/error toasts appear for update actions.

## Security & Environment
- Admin APIs use service role client (`createAdminClient`).
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Related email in `/api/report` uses `NEXT_PUBLIC_SITE_URL` for links.

## Testing

Quick curl examples (replace `<ISSUE_ID>`):

```bash
# Get list
curl -s http://localhost:3000/api/admin/issues | jq .items[0]

# Get issue detail
curl -s http://localhost:3000/api/admin/issues/<ISSUE_ID> | jq .

# Get status updates (newest first)
curl -s http://localhost:3000/api/admin/issues/<ISSUE_ID>/updates | jq .

# Add an update without status (defaults to in_progress)
curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d '{"notes":"Site inspected; crew dispatched"}' \
  http://localhost:3000/api/admin/issues/<ISSUE_ID>/updates | jq .

# Toggle resolved
curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d '{"status":"resolved","notes":"Fixed leak and tested"}' \
  http://localhost:3000/api/admin/issues/<ISSUE_ID>/updates | jq .
```

UI checks:
- Admin → Issues: cards show reporter and address; dialog supports two actions.
- Admin → Issue Details: status pill tracks latest update; address labeled; updates rendered with notes emphasis.

## Files Touched (Key)
- UI
  - `app/admin/issues/page.tsx`
  - `app/admin/issues/[id]/page.tsx`
  - `app/layout.tsx` (Sonner Toaster)
- API
  - `app/api/admin/issues/route.ts`
  - `app/api/admin/issues/[id]/route.ts`
  - `app/api/admin/issues/[id]/updates/route.ts`
  - `app/api/admin/issues/[id]/status/route.ts`
  - `app/api/admin/issues/status/route.ts`
- Types
  - `lib/types.ts` (Issue extended with reporter identity/address fields)

## Deprecations / Legacy
- `activity_logs` entries are no longer used for UI. The `/activity` endpoint can be removed later if not needed for audits.
- `issues.resolution_notes` and `issues.resolved_at` remain in DB but are not shown/maintained by the current UI.

## Department Portal (E2)
- Per-department password–gated portal under `/dept/*` for non-admin staff.
- Admin sets a hashed portal password per department via `POST /api/admin/departments/[id]/portal-password`.
- Session cookie (`dept_session`) carries the department context. Middleware gates `/dept/*` and `/api/dept/*`.
- New endpoints (scoped by department cookie):
  - `GET /api/dept/departments` (active list for login)
  - `POST /api/dept/session/login|logout`, `GET /api/dept/me`
  - `GET /api/dept/issues`, `GET /api/dept/issues/[id]`
  - `GET|POST /api/dept/issues/[id]/updates`
- Writes reuse the same mapping and persist to `issue_status_updates` with:
  - `author_label` (free-text staff name from UI)
  - `author_department_id` (new column)
  - `source='dept_portal'` (new column)
- UI pages:
  - `/dept/login` (select department, enter password, provide display name)
  - `/dept/issues` (list)
  - `/dept/issues/[id]` (details, timeline, two actions: Add Update, Mark Resolved/Reopen)

## Future Enhancements
- Optional: show latest 1 status update chip in the list view.
- Optional: auto-default open issues to in_progress on first admin view.
- Optional: add author identity (authenticated admin) instead of `author_label` string.
