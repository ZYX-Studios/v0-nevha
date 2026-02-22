# NEVHA Codebase Overhaul — Handoff Document
> **Date:** February 21, 2026  
> **Status:** Workstreams 1–6 complete. Workstreams 7–8 in progress.  
> **Project:** v0-nevha (Next.js 15, Supabase, Google Drive, Resend)

---

## Overview

This document records every change made during the NEVHA HOA codebase overhaul. It supersedes the original `ADMIN_PORTAL_HANDOFF.md` for anything related to auth, GDrive, registration, payments, vehicles, and profile management.

See `IMPLEMENTATION_PLAN.md` for the architectural rationale and `TASK_LIST.md` for progress tracking.

---

## 1. Environment & Configuration

### `.env.example` — Updated
**File:** `/.env.example`

Added all previously missing environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin bootstrap
ADMIN_ACCESS_KEY=
NEXT_PUBLIC_ADMIN_ACCESS_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM="NEVHA HOA <no-reply@yourdomain.com>"
EMAIL_REDIRECT_TO=

# Department portal cookie signing — REQUIRED
DEPT_PORTAL_SECRET=

# Public URL for email links
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Drive — see lib/google-drive.ts for usage
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=   # Root folder ID for all NEVHA uploads
```

**How to get Google Drive credentials:**
1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Desktop app type)
3. Use the OAuth Playground to generate a refresh token with `https://www.googleapis.com/auth/drive` scope
4. Create a shared Google Drive folder for NEVHA uploads → copy its folder ID from the URL

---

## 2. Database Migrations

All migrations were applied via `mcp_supabase-mcp-server_apply_migration` to project `gvfpdvcgeizorwozpbdg`.

### Migration 1: `normalize_role_enum_and_add_profile_fields`

```sql
-- Normalize role enum to canonical set (removed undocumented PUBLIC role)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'STAFF', 'DEPARTMENT', 'HOMEOWNER'));
UPDATE users SET role = 'HOMEOWNER' WHERE role = 'PUBLIC';

-- Profile fields added to homeowners
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS is_tenant boolean DEFAULT false;
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS tenant_name text;

-- New table for locked-field change requests (name changes, etc.)
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name text NOT NULL,           -- e.g. 'first_name', 'last_name'
  old_value text,
  new_value text,
  document_url text,                  -- proxy URL to supporting gov ID
  document_file_id text,              -- GDrive fileId for proxy lookup
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: homeowners can view/insert their own; ADMIN/STAFF can manage all
ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;
-- (policies created, see migration for full SQL)
```

### Migration 2: `hoa_dues_payment_link_and_vehicle_rls_policies`

```sql
-- Link hoa_dues to the payment that satisfied it
ALTER TABLE hoa_dues ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id);
ALTER TABLE hoa_dues ADD COLUMN IF NOT EXISTS status text DEFAULT 'unpaid'
  CHECK (status IN ('unpaid', 'paid', 'partial', 'waived'));
-- Required for upsert on approval
ALTER TABLE hoa_dues ADD CONSTRAINT hoa_dues_homeowner_year_unique
  UNIQUE (homeowner_id, dues_year);

-- Vehicle requests: admin review audit columns
ALTER TABLE vehicle_requests ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE vehicle_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);
ALTER TABLE vehicle_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- RLS for vehicle_requests (previously had none)
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;
-- homeowners: SELECT + INSERT own rows
-- ADMIN/STAFF: full management

-- RLS for payments (previously had none)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- homeowners: INSERT + SELECT own payments (via homeowner_id)
-- ADMIN/STAFF: full management
```

---

## 3. Auth & Security (Workstream 1)

### `middleware.ts` — Rewritten
**File:** `/middleware.ts`

Now a thin entry point that delegates to `lib/supabase/middleware.ts`. No logic lives here.

### `lib/supabase/middleware.ts` — Rewritten
**File:** `/lib/supabase/middleware.ts`

**Before:** Only refreshed Supabase session cookie. Zero route protection.

**After:** Full route protection with three tiers:

| Tier | Routes | Check |
|------|--------|-------|
| Admin | `/admin/*` | Valid session + `users.role IN ('ADMIN','STAFF')` |
| Member | `/bills`, `/profile`, `/vehicles`, `/onboarding`, `/refresh` | Valid session |
| Dept | `/dept/*` (not `/dept/login`) | `dept_session` cookie present |
| Public | `/`, `/auth/*`, `/api/auth/*`, `/report/*`, `/status/*`, `/api/report`, `/api/status`, `/api/announcements`, `/api/residents`, `/api/dept/*`, `/api/departments` | Pass through |

**Redirect behavior:**
- No session on admin route → `/auth?next=/admin` (preserves intended destination)
- Has session but wrong role → `/` (home)
- No dept cookie → `/dept/login`
- No session on member route → `/auth?next=/original-path`

### `lib/supabase/guards.ts` — Rewritten
**File:** `/lib/supabase/guards.ts`

Cleaned up. Removed duplicate HMAC logic — dept session verification now delegates to `lib/dept/session.ts`.

| Export | Use | What it does |
|--------|-----|--------------|
| `requireAuth()` | Server components / page guards | Redirects to `/auth` if no session |
| `requireAdmin()` | Server components / page guards | Redirects to `/auth` or `/` based on role |
| `requireAuthAPI()` | API routes | Returns 401 `NextResponse` or `null` |
| `requireAdminAPI()` | API routes | Returns 401/403 `NextResponse` or `null` |
| `requireDeptSessionAPI()` | Dept API routes | Returns 401 or `{ error: null, payload: DeptSession }` |

### `lib/dept/session.ts` — Updated
**File:** `/lib/dept/session.ts`

- Added `SESSION_TTL_SECONDS = 7 * 24 * 60 * 60`
- `verifySession()` now checks age against TTL — sessions older than 7 days are rejected

### `lib/dept/auth.ts` — Bug fix
**File:** `/lib/dept/auth.ts`

- Fixed: `cookies()` missing `await` (Next.js 15 requires `await cookies()`)

---

## 4. Google Drive (Workstream 2)

### `lib/google-drive.ts` — Complete rewrite
**File:** `/lib/google-drive.ts`

**Critical security fix:** Removed the `drive.permissions.create` call that made every uploaded file world-readable. Files are now owner-only by default (Google Drive's default).

**New folder structure:**
```
NEVHA Root/                          ← GOOGLE_DRIVE_FOLDER_ID
  {FirstName_LastName}_{userId8}/    ← person folder, created lazily
    Registrations/                   ← gov IDs, proof of residence, name-change docs
    Payments/                        ← payment proof screenshots/receipts
    Vehicles/                        ← OR/CR documents
    Profile/                         ← profile photo
```

**Exported functions:**

| Function | Purpose | Params |
|----------|---------|--------|
| `uploadRegistrationDoc(buffer, name, mime, personName, personId, docType)` | Onboarding + name-change docs | `docType`: `'id'`, `'proof_of_residence'`, `'name_change'` |
| `uploadPaymentProof(buffer, name, mime, personName, personId)` | Payment receipts | — |
| `uploadVehicleDoc(buffer, name, mime, personName, personId, plateNumber)` | OR/CR uploads | plate used in filename |
| `uploadProfilePhoto(buffer, name, mime, personName, personId)` | Profile photos | — |
| `streamFileFromDrive(fileId)` | Proxy streaming | Returns `{ stream, mimeType, fileName }` |
| `validateUploadFile(file)` | Before any upload | Max 10MB, JPEG/PNG/WebP/PDF |

**Return type** (`DriveUploadResult`):
```typescript
{ fileId: string, webViewLink: string }
```
> Always store `fileId`, not the webViewLink. The `webViewLink` is only for HOA account direct access. Users access files via the proxy.

### `app/api/gdrive-proxy/route.ts` — New
**File:** `/app/api/gdrive-proxy/route.ts`

```
GET /api/gdrive-proxy?fileId=<driveFileId>
```

**Auth logic:**
- Must be authenticated (any role)
- ADMIN/STAFF → can access any file
- HOMEOWNER → file must be referenced in their own `registration_requests.documents`, `payments.proof_drive_file_id`, `vehicle_requests.documents`, or `homeowners.profile_photo_url`

**Response:** Streams file inline (`Content-Disposition: inline`) for browser preview (images, PDFs). Cached for 5 minutes (`Cache-Control: private, max-age=300`).

### Upload call sites updated:
- **`app/onboarding/actions.ts`** — Uses `uploadRegistrationDoc()`, stores `{ type, fileId, viewLink, uploadedAt, fileName }` in `registration_requests.documents` JSONB array
- **`app/api/payments/upload-proof/route.ts`** — Uses `uploadPaymentProof()`, returns `{ fileId, proxyUrl }` instead of a public URL

---

## 5. Registration Admin Approval (Workstream 3)

### `app/api/admin/registrations/match-homeowner/route.ts` — New
**File:** `/app/api/admin/registrations/match-homeowner/route.ts`

```
GET /api/admin/registrations/match-homeowner
```

**Query params:** `block`, `lot`, `phase`, `firstName`, `lastName`

**What it does:**
1. Queries `homeowners` where `user_id IS NULL` (unlinked Airtable imports — 653 records)
2. Filters by block+lot (exact) or name (ILIKE)
3. Scores each match:
   - Same block: +40 pts
   - Same lot: +40 pts
   - Same phase: +10 pts
   - First name match: +5 pts
   - Last name match: +5 pts
4. Returns top 10 sorted by score, with `matchReasons` array

Auto-selects the top result if score ≥ 80 (exact address match).

### `app/api/admin/registrations/[id]/approve/route.ts` — New
**File:** `/app/api/admin/registrations/[id]/approve/route.ts`

```
POST /api/admin/registrations/[id]/approve
Body: { matchedHomeownerId?: string }
```

**Flow:**
1. Fetch `registration_requests` row, verify status = `pending`
2. If `matchedHomeownerId` provided → `UPDATE homeowners SET user_id = req.user_id WHERE id = matchedHomeownerId AND user_id IS NULL`
3. If no match → `INSERT INTO homeowners` with registration data
4. `UPDATE users SET role = 'HOMEOWNER' WHERE id = req.user_id`
5. `UPDATE registration_requests SET status = 'approved', reviewed_by, reviewed_at`
6. Call `/api/email/registration-approved` (fire-and-forget)

**Safety:** The `AND user_id IS NULL` guard prevents accidentally overwriting an already-linked homeowner.

### `app/api/admin/registrations/[id]/reject/route.ts` — New
**File:** `/app/api/admin/registrations/[id]/reject/route.ts`

```
POST /api/admin/registrations/[id]/reject
Body: { reason: string }  ← required, min 1 char
```

Updates `status = 'rejected'`, `admin_notes = reason`, calls rejection email.

### `components/admin/registrations-table.tsx` — Rewritten
**File:** `/components/admin/registrations-table.tsx`

**Before:** Buttons called server actions. `alert()`/`confirm()` for UX. Document links were direct GDrive URLs (now broken since files are private).

**After:**
- Approve → opens Dialog → fetches match suggestions → admin picks linked record or "Create New" → calls approve API
- Reject → opens Dialog → admin types reason → calls reject API
- Document links → `href="/api/gdrive-proxy?fileId=..."` (authenticated proxy)
- Removed server action imports (`approveRegistration`, `rejectRegistration`)

---

## 6. Payments (Workstream 4)

### `app/api/admin/payments/[id]/verify/route.ts` — New
**File:** `/app/api/admin/payments/[id]/verify/route.ts`

```
POST /api/admin/payments/[id]/verify
Body: { action: 'verified' | 'rejected', adminNotes?: string }
```

**On `verified`:**
1. Update `payments.status = 'verified'`, `verified_by`, `verified_at`, `admin_notes`
2. If `fee_type = 'annual_dues'`:
   - `INSERT INTO hoa_dues (...) ON CONFLICT (homeowner_id, dues_year) DO UPDATE SET amount_paid, payment_date, payment_method, payment_id, status = 'paid'`
3. If `fee_type = 'car_sticker'`:
   - Find most recent `stickers` row for this homeowner (by `issued_at`)
   - `UPDATE stickers SET amount_paid = payment.amount`

**On `rejected`:** Updates `payments.status = 'rejected'` and `admin_notes`.

### `components/admin/payments-table.tsx` — Rewritten
**File:** `/components/admin/payments-table.tsx`

**Before:** Imported server actions `approvePayment`, `rejectPayment`. Payment proof links showed raw Drive file IDs with a TODO comment.

**After:**
- Proof links: `href="/api/gdrive-proxy?fileId=${p.proof_drive_file_id}"` for GDrive files; original `proof_url` as fallback
- Verify button → calls `PATCH /api/admin/payments/[id]/verify` with `action: 'verified'`
- Reject button → opens Dialog with optional notes → calls verify with `action: 'rejected'`
- Added `payment_method` column with a Badge
- Removed old modal confirmation code

---

## 7. Vehicle Registration (Workstream 5)

### `app/api/vehicles/upload-doc/route.ts` — New
**File:** `/app/api/vehicles/upload-doc/route.ts`

```
POST /api/vehicles/upload-doc
Body: FormData { file, plateNumber, docType: 'or' | 'cr' }
```

Uploads OR or CR document to `{Person}/Vehicles/` in GDrive. Returns `{ fileId, proxyUrl, docType, fileName }`. Server-side validated (10MB max, image/PDF only).

### `app/api/admin/vehicles/[id]/approve/route.ts` — New
**File:** `/app/api/admin/vehicles/[id]/approve/route.ts`

```
POST /api/admin/vehicles/[id]/approve
Body: { stickerCode?: string }   ← admin override; auto-generated if absent
```

**Flow:**
1. Fetch `vehicle_requests`, verify `status = 'pending'`
2. Get `homeowners` row via `user_id`
3. `INSERT INTO vehicles { homeowner_id, plate_no, category }`
4. Generate sticker code: `NVH-YY-XXXXXX` (e.g. `NVH-25-A3B7Z1`) — chars exclude ambiguous `0/O`, `1/I/L`
5. Uniqueness check: query `stickers` for the code, regenerate up to 5 times on collision
6. `INSERT INTO stickers { homeowner_id, vehicle_id, code, status: 'ACTIVE', issued_at, expires_at: Dec 31 next year }`
7. `UPDATE vehicle_requests SET status = 'approved'`
8. Call `/api/email/vehicle-approved` (fire-and-forget)
9. **Rollback**: if sticker creation fails, vehicle record is deleted

### `app/api/admin/vehicles/[id]/reject/route.ts` — New
**File:** `/app/api/admin/vehicles/[id]/reject/route.ts`

```
POST /api/admin/vehicles/[id]/reject
Body: { reason: string }   ← required
```

Updates status, sends rejection email with plate number and reason.

---

## 8. Profile Management (Workstream 6)

### `app/api/profile/route.ts` — New
**File:** `/app/api/profile/route.ts`

```
PATCH /api/profile
Body: { contact_number?, email?, facebook_profile? }
```

- Zod strict schema — rejects any field not in the allowlist
- Updates `homeowners` via admin client (bypasses RLS), scoped to `user_id = auth user`
- **Does NOT allow:** first_name, last_name, block, lot, phase, or any other field

### `app/api/profile/photo/route.ts` — New
**File:** `/app/api/profile/photo/route.ts`

```
POST /api/profile/photo
Body: FormData { file }
```

Uploads to `{Person}/Profile/` folder in GDrive. Stores proxy URL (`/api/gdrive-proxy?fileId=...`) in `homeowners.profile_photo_url`. Server-side validated.

### `app/api/profile/name-change/route.ts` — New
**File:** `/app/api/profile/name-change/route.ts`

```
POST /api/profile/name-change
Body: FormData { fieldName: 'first_name' | 'last_name', newValue, file }

GET /api/profile/name-change
→ Returns user's own profile_change_requests (last 10)
```

**POST flow:**
- Validates field name and new value with Zod
- Requires a government ID document upload (validated, uploaded to `Registrations/` subfolder)
- Creates `profile_change_requests` row with status `'pending'`
- Admin must then approve via (pending) admin UI

### `components/profile/edit-profile-modal.tsx` — Rewritten
**File:** `/components/profile/edit-profile-modal.tsx`

**Before:** Direct Supabase client write on all fields including `first_name`, `last_name` — bypassed the approval requirement entirely.

**After:** Two-tab modal:

| Tab | Fields | Backend | Guard |
|-----|--------|---------|-------|
| Contact Info | phone, email | `PATCH /api/profile` | None (free edit) |
| Name | first_name or last_name + gov ID upload | `POST /api/profile/name-change` | Requires document |

Name tab shows success state after submission with clear messaging about admin review.

---

## 9. API Endpoints Summary

### New endpoints created this session:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/gdrive-proxy` | Any auth | Stream GDrive file inline |
| `GET` | `/api/admin/registrations/match-homeowner` | ADMIN/STAFF | Find matching homeowners for a registration |
| `POST` | `/api/admin/registrations/[id]/approve` | ADMIN/STAFF | Approve registration, link/create homeowner |
| `POST` | `/api/admin/registrations/[id]/reject` | ADMIN/STAFF | Reject registration with reason |
| `POST` | `/api/admin/payments/[id]/verify` | ADMIN/STAFF | Verify or reject a payment, update hoa_dues/stickers |
| `POST` | `/api/vehicles/upload-doc` | Any auth | Upload vehicle OR/CR to GDrive |
| `POST` | `/api/admin/vehicles/[id]/approve` | ADMIN/STAFF | Approve vehicle, create vehicles+stickers records |
| `POST` | `/api/admin/vehicles/[id]/reject` | ADMIN/STAFF | Reject vehicle request with reason |
| `PATCH` | `/api/profile` | Any auth | Update free-edit profile fields |
| `POST` | `/api/profile/photo` | Any auth | Upload profile photo to GDrive |
| `POST` | `/api/profile/name-change` | Any auth | Submit name-change request with doc |
| `GET` | `/api/profile/name-change` | Any auth | Get own name-change requests |

### Modified endpoints:

| Method | Path | What changed |
|--------|------|-------------|
| `POST` | `/api/payments/upload-proof` | Uses `uploadPaymentProof()`, restricted GDrive, validated |

---

## 10. What Still Needs Doing

### Immediate (next session)

1. **Member `/vehicles` form** — Add OR/CR upload fields wired to `/api/vehicles/upload-doc`; store fileIds in `vehicle_requests.documents`

2. **Member `/bills` page** — Add car sticker payment type selector; show vehicle list; submit payment with `fee_type: 'car_sticker'`

3. **Email handler routes** — Create these endpoints (called fire-and-forget from approve/reject):
   - `POST /api/email/registration-approved` → send approval email via Resend
   - `POST /api/email/registration-rejected` → send rejection email with reason
   - `POST /api/email/vehicle-approved` → send vehicle approval + sticker code + payment instructions
   - `POST /api/email/vehicle-rejected` → send rejection with reason

4. **Admin vehicles page** — `/app/admin/vehicles/page.tsx` with pending request list, view documents, approve (sticker code override), reject dialogs

5. **Admin profile change requests** — New admin page to review/approve/reject name change requests; on approve: update `homeowners` row and mark request approved

### Later (Workstream 7-8)

6. **Admin portal redesign** — Mobile-first sidebar layout, stats dashboard, responsive tables
7. **Security advisor run** — `mcp_supabase-mcp-server_get_advisors` to check RLS coverage and performance
8. **End-to-end testing** — Full user flow: register → upload docs → admin approves → bills → vehicles → admin approves vehicle

---

## 11. Known Issues / Notes for Next Dev

- The pre-existing `/app/api/admin/[various]/[id]/route.ts` files have a **malformed TypeScript function signature** (the `requireAdminAPI()` call was moved inside the destructuring parameter). These were pre-existing errors, not introduced in this session. Each affected file needs its function signature fixed. Example fix needed:
  ```typescript
  // ❌ Current (broken)
  export async function DELETE(_req: Request, {
    const authError = await requireAdminAPI()  // ← inside params!
    if (authError) return authError
   params }: { params: { id: string } }) {
  
  // ✅ Should be
  export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const authError = await requireAdminAPI()
    if (authError) return authError
  ```
  Affected files: `api/admin/departments/[id]/route.ts`, `api/admin/departments/[id]/issues/route.ts`, `api/admin/departments/[id]/portal-password/route.ts`, `api/admin/homeowners/[id]/route.ts`, `api/admin/homeowners/[id]/members/route.ts`, `api/admin/homeowners/[id]/stickers/route.ts`, `api/admin/homeowners/[id]/vehicles/route.ts`, `api/admin/announcements/[id]/route.ts`

- The `payments` table has both `proof_url` (legacy) and `proof_drive_file_id` (new). The PaymentsTable renders whichever is present. Going forward, only `proof_drive_file_id` should be populated.

- `hoa_dues` now has a unique constraint on `(homeowner_id, dues_year)`. If existing data violates this, the constraint might fail if there are duplicates. Check with: `SELECT homeowner_id, dues_year, COUNT(*) FROM hoa_dues GROUP BY homeowner_id, dues_year HAVING COUNT(*) > 1;`
