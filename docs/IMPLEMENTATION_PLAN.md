# NEVHA Codebase Audit & Implementation Plan

## Overview

Full overhaul of the NEVHA (Northfields Executive Village Homeowners Association) application — a Next.js 15 App Router codebase with Supabase backend, Google Drive integration, and three interfaces: member-facing app, admin portal, and department portal.

The goal is to fix broken/incomplete features, harden security, organize file storage, and redesign the admin/dept portals for mobile-friendly use.

> [!IMPORTANT]
> This plan is ordered by **dependency** — later workstreams depend on earlier ones. Execute in order.

---

## Audit Summary

### Current Architecture
- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion
- **Auth**: Supabase Auth (email/password) for members + admins; cookie-based password auth for dept portal
- **Database**: Supabase Postgres (22 public tables, RLS enabled) — project `gvfpdvcgeizorwozpbdg`
- **File Storage**: Google Drive (OAuth2 refresh token flow) — no Supabase Storage used
- **Email**: Resend for transactional emails (issue notifications, dept routing)

### Critical Bugs & Gaps Found

| # | Area | Severity | Issue |
|---|------|----------|-------|
| 1 | Auth | 🔴 Critical | Middleware only refreshes sessions — no route protection. Anyone can hit `/admin` routes. |
| 2 | Auth | 🟡 Medium | Role enum mismatch: DB allows `ADMIN, STAFF, DEPARTMENT, HOMEOWNER`; PRD says `PUBLIC, STAFF, ADMIN`. |
| 3 | GDrive | 🔴 Critical | All files uploaded publicly (`anyone = reader`) — sensitive docs (IDs, payment proofs) are world-readable. |
| 4 | GDrive | 🟡 Medium | Flat folder structure — all files dumped in one folder regardless of type. |
| 5 | GDrive | 🟡 Medium | `.env.example` missing Google Drive env vars. |
| 6 | Vehicles | 🔴 Critical | OR/CR document upload has `// TODO` — not implemented. |
| 7 | Vehicles | 🟡 Medium | Admin approval flow doesn't create `vehicles`/`stickers` records or send email. |
| 8 | Payments | 🟡 Medium | No car sticker payment flow from member side. Only annual dues. |
| 9 | Payments | 🟡 Medium | Admin payment approval doesn't update `hoa_dues` table. |
| 10 | Profile | 🟡 Medium | Profile page is fully read-only. No editing capability. |
| 11 | Registration | 🟡 Medium | Admin approval doesn't match/link existing homeowner records. |
| 12 | Dept Portal | 🟢 Low | `requireDeptSessionAPI` only checks cookie existence, not JWT payload validity. |
| 13 | Uploads | 🟡 Medium | No server-side file size or type validation for any upload flow. |

---

## Workstream 1: Auth & Security Hardening

### Problem
- Middleware does nothing except session refresh. No route-level protection.
- Role enum is inconsistent between DB and code.
- File uploads are publicly accessible.

### Proposed Changes

#### [MODIFY] [middleware.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/middleware.ts)
Add route protection logic to `updateSession`:
- `/admin/*` → require authenticated user with `ADMIN` or `STAFF` role (redirect to `/auth`)
- `/bills`, `/profile`, `/vehicles`, `/onboarding` → require authenticated user (redirect to `/auth`)
- `/dept/*` → check for `dept_session` cookie (redirect to `/dept/login`)
- Public routes (`/`, `/announcements`, `/report`, `/status/*`, `/auth/*`, `/api/report`, `/api/status`, `/api/announcements`, `/api/residents`, `/api/auth/*`, `/api/dept/*`) → pass through

#### [MODIFY] [middleware.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/lib/supabase/middleware.ts)
- After `getUser()`, check the path against protected route patterns
- For admin routes: query `users.role` and validate
- For member routes: just verify session exists
- Return `NextResponse.redirect()` to `/auth` on failure

#### [MODIFY] [guards.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/lib/supabase/guards.ts)
- Update `requireDeptSessionAPI` to actually verify the JWT payload (parse + verify signature against `DEPT_PORTAL_SECRET`, check expiry and `portal_password_updated_at`)

#### DB Migration: Normalize role enum
```sql
-- Confirm canonical roles: ADMIN, STAFF, DEPARTMENT, HOMEOWNER
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('ADMIN', 'STAFF', 'DEPARTMENT', 'HOMEOWNER'));
```

#### [MODIFY] [.env.example](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/.env.example)
Add missing Google Drive vars:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

---

## Workstream 2: Google Drive Reorganization

### Problem
All uploads go to a single flat folder with public permissions.

### Proposed Changes

#### [MODIFY] [google-drive.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/lib/google-drive.ts)
1. **Remove public permission** — Delete the `permissions.create` call that sets `anyone = reader`
2. **Add folder creation helper**: `getOrCreateFolder(name, parentId)` that checks for existing folder by name before creating
3. **Add person-folder helper**: `getPersonFolder(personName, personId)` that creates/gets `{PersonName}_{PersonId}/` under the root folder
4. **Add subfolder helper**: `getSubFolder(personFolderId, type)` where type is `Registrations`, `Payments`, `Vehicles`
5. **Export new upload functions**:
   - `uploadRegistrationDoc(buffer, fileName, mimeType, personName, personId)` → uploads to `{Person}/Registrations/`
   - `uploadPaymentProof(buffer, fileName, mimeType, personName, personId)` → uploads to `{Person}/Payments/`
   - `uploadVehicleDoc(buffer, fileName, mimeType, personName, personId, plateNumber)` → uploads to `{Person}/Vehicles/`

#### [NEW] [google-drive-proxy/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/gdrive-proxy/route.ts)
- Authenticated proxy endpoint: `GET /api/gdrive-proxy?fileId=...`
- Requires auth (admin or file owner)
- Fetches file content from Google Drive using service credentials
- Streams response to client
- This replaces direct GDrive public links in the UI

#### Update all upload call sites:
- [actions.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/onboarding/actions.ts) — use `uploadRegistrationDoc`
- [upload-proof/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/payments/upload-proof/route.ts) — use `uploadPaymentProof`
- Vehicle upload (new, see Workstream 5) — use `uploadVehicleDoc`

---

## Workstream 3: Registration & Onboarding Fix

### Problem
Admin approval of registrations doesn't match/link existing homeowners (653 unlinked Airtable imports exist).

### Proposed Changes

#### [NEW] [match-homeowner/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/registrations/match-homeowner/route.ts)
- `GET /api/admin/registrations/match-homeowner?block=&lot=&phase=&name=`
- Searches `homeowners` table for matching block/lot/phase
- Falls back to fuzzy name match (`ILIKE` on `full_name`, `first_name`, `last_name`)
- Returns top 5 matches with confidence score (exact address match = high, name only = low)

#### [NEW] [approve/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/registrations/[id]/approve/route.ts)
- `POST /api/admin/registrations/[id]/approve`
- Body: `{ matchedHomeownerId?: string }` (optional — if admin picked a match)
- If `matchedHomeownerId` provided: link by setting `homeowners.user_id = registration.user_id`
- If not provided: create new `homeowners` row from registration data, set `user_id`
- Update `registration_requests.status = 'approved'`, set `reviewed_by`, `reviewed_at`
- Update `users.role = 'HOMEOWNER'` (if not already)
- Send approval email to user

#### [NEW] [reject/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/registrations/[id]/reject/route.ts)
- `POST /api/admin/registrations/[id]/reject`
- Body: `{ reason: string }`
- Update `registration_requests.status = 'rejected'`, `admin_notes = reason`
- Send rejection email with reason

#### [MODIFY] [registrations-table.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/components/admin/registrations-table.tsx)
- Add "View Documents" button that opens GDrive proxy links
- On "Approve" click: first call match-homeowner API and show suggestions dialog
  - Admin picks an existing homeowner OR clicks "Create New"
- On "Reject" click: show dialog for rejection reason

#### [MODIFY] [actions.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/onboarding/actions.ts)
- Add server-side file validation: max 10MB, allowed types: `image/jpeg, image/png, image/webp, application/pdf`
- Use the new `uploadRegistrationDoc` function with person-folder structure

---

## Workstream 4: Payments & Bills Complete Flow

### Problem
No car sticker payment from member side. Admin approval doesn't update `hoa_dues`.

### Proposed Changes

#### [MODIFY] [bills-content.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/bills/bills-content.tsx)
- Add a second payment type selector: "Annual Dues" | "Car Sticker"
- For car sticker: show member's registered vehicles (from `vehicles` table) and let them select which car
- Both types show QR code, upload proof, and submit payment

#### [MODIFY] [page.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/bills/page.tsx)
- Also fetch vehicles for the homeowner to populate the car sticker payment selector

#### [NEW] [verify/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/payments/[id]/verify/route.ts)
- `POST /api/admin/payments/[id]/verify`
- Body: `{ action: 'verified' | 'rejected', adminNotes?: string }`
- On verify:
  - Update `payments.status = 'verified'`, `verified_by`, `verified_at`
  - If `fee_type = 'annual_dues'`: upsert `hoa_dues` row for that homeowner+year, set `amount_paid`, `payment_date`, `payment_method`
  - If `fee_type = 'car_sticker'`: update the relevant sticker's `amount_paid`
- On reject: update `payments.status = 'rejected'`, `admin_notes`

#### [MODIFY] [payments-table.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/components/admin/payments-table.tsx)
- Add "View Proof" button that opens GDrive proxy
- Add "Approve" / "Reject" actions wired to the new verify endpoint
- Show homeowner name, fee type, year, amount, method

---

## Workstream 5: Vehicle Registration — Complete Flow

### Problem
OR/CR upload missing. Admin approval doesn't create records or send email.

### Member-Facing Changes

#### [MODIFY] [page.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/vehicles/page.tsx)
- Add OR/CR document upload fields to the registration form (required)
- Files uploaded to GDrive via new `uploadVehicleDoc` helper
- Store document URLs in `vehicle_requests.documents` JSONB

#### [MODIFY] [actions.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/vehicles/actions.ts)
- Update `submitVehicleRequest` to accept and store document references
- Add server-side file validation (max 10MB, image/pdf only)

### Admin-Facing Changes

#### [NEW] [approve/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/vehicles/[id]/approve/route.ts)
- `POST /api/admin/vehicles/[id]/approve`
- Body: `{ stickerCode?: string }` (optional admin override; auto-generate if absent)
- Logic:
  1. Get the `vehicle_requests` row
  2. Get the homeowner linked to `vehicle_requests.user_id` → `homeowners.user_id`
  3. Upsert `vehicles` row (plate_number, vehicle_type)
  4. Create `stickers` row (homeowner_id, vehicle_id, code, status=ACTIVE, issued_at=now)
  5. Update `vehicle_requests.status = 'approved'`
  6. Send approval email: "Your vehicle {plate} has been registered. Sticker #{code} assigned. Please pay via the Bills page."

#### [NEW] [reject/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/admin/vehicles/[id]/reject/route.ts)
- `POST /api/admin/vehicles/[id]/reject`
- Body: `{ reason: string }`
- Update status, send rejection email

#### [MODIFY] Admin vehicles page
- `app/admin/vehicles/page.tsx`: show pending vehicle requests with "View Documents", "Approve", "Reject" actions
- Approve dialog: show auto-generated sticker code, let admin override

#### Auto-generate sticker code function:
```typescript
function generateStickerCode(): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `NVH-${year}-${random}`
}
```

---

## Workstream 6: Profile Management

### Problem
Profile is read-only. No edit capability. No tenant support.

### Proposed Changes

#### [MODIFY] [profile-content.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/profile/profile-content.tsx)
Add three tiers of editing:

**Freely editable** (save via API, no approval):
- Phone / Contact Number
- Email
- Emergency Contact Name/Phone
- Facebook Profile
- Profile Photo (upload to GDrive person folder)

**Locked (requires doc re-upload + admin approval)**:
- First Name, Last Name, Suffix
- Show a "Request Name Change" flow that:
  1. Opens a dialog to upload new government ID
  2. Creates a change request record
  3. Admin reviews and approves/rejects

**Read-only (admin-only)**:
- Block, Lot, Phase, Street, Property Address
- Ownership status (owner vs tenant)

#### [NEW] [route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/profile/route.ts)
- `PATCH /api/profile` — update freely editable fields
- Requires auth, validates that user owns the homeowner record

#### [NEW] [photo/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/profile/photo/route.ts)
- `POST /api/profile/photo` — upload profile photo
- Store in GDrive person folder, save URL to homeowners table

#### DB Migration: Add profile fields
```sql
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS tenant_name text;
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS is_tenant boolean DEFAULT false;
```

#### [NEW] Profile change requests table
```sql
CREATE TABLE profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL REFERENCES homeowners(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  document_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## Workstream 7: Admin Portal Redesign

### Problem
Admin UI is functional but needs mobile-friendly redesign with better UX.

### Design Direction
- Keep **existing functionality** — this is a layout/styling pass, not a rewrite
- Create a new admin design system: clean sidebar nav (collapsible on mobile), consistent card layouts, data tables with mobile-responsive layouts
- Use the existing shadcn/ui components but with a fresh theme
- Mobile-friendly: hamburger menu, stacked layouts on small screens, large touch targets

### Proposed Changes

#### [NEW] [admin-layout.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/admin/layout.tsx) (overwrite existing)
- Responsive sidebar: visible on desktop, sliding drawer on mobile
- Nav items: Dashboard, Homeowners, Issues, Payments, Registrations, Vehicles, Announcements, Departments, QR Codes, Dues Config
- User info + logout in sidebar footer

#### [MODIFY] [page.tsx](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/admin/page.tsx) — Dashboard
- Stats cards (pending registrations, pending payments, pending vehicle requests, open issues)
- Quick actions grid
- Recent activity feed
- Mobile: single-column stack

#### Redesign each admin sub-page:
- Consistent header with breadcrumbs
- Responsive data tables (card view on mobile)
- Action dialogs with proper form validation
- Consistent empty states

### Department Portal Changes

#### [MODIFY] Dept pages (`app/dept/`)
- Apply same admin design system
- Ensure issue list and detail pages are mobile-friendly
- Add better status update UX

---

## Workstream 8: Hardening & Polish

#### Server-side validation for all uploads
- Max file size: 10MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, application/pdf`
- Sanitize filenames

#### [MODIFY] [upload-proof/route.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/api/payments/upload-proof/route.ts)
- Add file validation before upload

#### [MODIFY] [actions.ts](file:///Users/robguevarra/Documents/Coding%20Projects/v0-nevha/app/onboarding/actions.ts)
- Add file validation before upload

#### RLS Policy Audit
- Run `get_advisors` security check
- Ensure all new tables have proper RLS policies
- Verify `payments` RLS allows homeowner to insert their own payments
- Verify `vehicle_requests` RLS allows homeowner to insert their own requests
- Verify `profile_change_requests` RLS allows homeowner to insert/read their own

---

## Execution Order

This is the recommended execution sequence. Each workstream should be completed and verified before moving to the next.

| Order | Workstream | Est. Effort | Dependencies |
|-------|-----------|-------------|--------------|
| 1 | Auth & Security | Large | None |
| 2 | Google Drive Reorg | Large | Workstream 1 (env vars) |
| 3 | Registration Fix | Medium | Workstreams 1, 2 |
| 4 | Payments Complete | Medium | Workstream 2 |
| 5 | Vehicle Registration | Medium | Workstreams 2, 4 |
| 6 | Profile Management | Medium | Workstreams 1, 2 |
| 7 | Admin Redesign | Large | All above (uses new endpoints) |
| 8 | Hardening & Polish | Medium | All above |

---

## Verification Plan

### Automated Verification
- Run `npm run build` after each workstream to catch type errors
- Run existing linting: `npx next lint`

### Manual Browser Verification (per workstream)

**Workstream 1 — Auth:**
1. Open browser incognito → navigate to `/admin` → should redirect to `/auth`
2. Log in as homeowner → navigate to `/admin` → should redirect to `/`
3. Log in as admin → navigate to `/admin` → should load dashboard
4. Test dept portal: go to `/dept/issues` without cookie → should redirect to `/dept/login`

**Workstream 2 — Google Drive:**
1. Upload a file via onboarding → verify in Google Drive console that file is in a person subfolder
2. Try accessing the file URL directly without auth → should NOT be accessible
3. Access via `/api/gdrive-proxy?fileId=...` while logged in → should stream file

**Workstream 3 — Registration:**
1. Submit a new registration via `/auth` (register tab)
2. Go to admin registrations → click Approve → verify match suggestions appear
3. Select a match → verify homeowner record is linked
4. Check that user can now access `/profile` with their homeowner data

**Workstream 4 — Payments:**
1. Log in as homeowner → go to `/bills`
2. Select "Car Sticker" payment type → verify vehicle selector appears
3. Upload proof → submit → check pending payment in admin
4. Admin approves → verify `hoa_dues` or sticker `amount_paid` updated

**Workstream 5 — Vehicles:**
1. Log in as homeowner → go to `/vehicles`
2. Click "Register New Vehicle" → upload OR/CR docs → submit
3. Admin → Vehicles → verify pending request with documents visible
4. Admin approves → verify `vehicles` + `stickers` records created
5. Check homeowner received approval email

**Workstream 6 — Profile:**
1. Log in as homeowner → go to `/profile`
2. Edit phone number → save → refresh → verify persisted
3. Click "Request Name Change" → upload doc → verify change request created
4. Admin approves → check name updated

**Workstream 7 — Admin Redesign:**
1. Open admin on mobile viewport (375px width) → verify all pages are usable
2. Verify sidebar collapses to hamburger menu
3. Navigate all admin sections → confirm no broken layouts

**Workstream 8 — Hardening:**
1. Try uploading a 50MB file → should be rejected with clear error
2. Try uploading a `.exe` file → should be rejected
3. Run: `mcp_supabase-mcp-server_get_advisors` with `type: security` → verify no critical RLS issues

### User Manual Testing
- Deploy to staging/preview after each workstream
- User tests the complete end-to-end flow: register → onboarding → doc upload → admin approval → profile → bills → vehicle reg → admin approval
