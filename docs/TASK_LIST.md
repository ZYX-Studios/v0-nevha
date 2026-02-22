# NEVHA Overhaul — Task List (Current State)
*Last updated: 2026-02-22*

## ✅ Complete

### Auth & Security
- Route protection middleware (admin/member/dept)
- Role enum normalization (ADMIN / STAFF / DEPARTMENT / HOMEOWNER)
- Dept session JWT with HMAC-SHA256 + TTL
- Google Drive → owner-only file access
- Server-side upload validation (10MB, JPEG/PNG/WebP/PDF)

### Google Drive
- Per-person folder structure `{Name}_{userId}/Registrations|Payments|Vehicles|Profile`
- Authenticated GDrive proxy `/api/gdrive-proxy`
- Updated: onboarding, payment proof, vehicle OR/CR, profile photo uploads

### Registration / Onboarding
- `/api/admin/registrations/match-homeowner` — fuzzy match scoring
- `/api/admin/registrations/[id]/approve` — links or creates homeowner record
- `/api/admin/registrations/[id]/reject` — sends email with reason
- RegistrationsTable: match dialog, doc preview via proxy, reject reason dialog

### Payments & Bills
- `/api/admin/payments/[id]/verify` — updates `hoa_dues` or sticker amount_paid
- PaymentsTable: proxy links, reject dialog, verify wired
- PaymentModal supports car sticker fee type selection + vehicle selector + complete payment flow

### Vehicle Registration (Member)
- `/api/vehicles/upload-doc` — OR/CR to GDrive per-person Vehicles folder
- Member `/vehicles` form: OR + CR required upload zones, parallel GDrive upload before submit
- `VehicleDocumentRef[]` stored in `vehicle_requests.documents` JSONB

### Vehicle Registration (Admin)
- `/api/admin/vehicles/[id]/approve` — creates vehicles + stickers, NVH-YY-XXXXXX code, approval email
- `/api/admin/vehicles/[id]/reject` — sends rejection email with reason
- Approve/reject flow now in `VerificationsVehicles` on unified `/admin/verifications` page

### Profile Management
- `/api/profile` PATCH — phone, email, facebook
- `/api/profile/photo` POST — uploads to GDrive Profile folder
- `/api/profile/name-change` POST/GET
- EditProfileModal 2-tab UI (contact / name-change-with-gov-id-upload)
- DB: `profile_photo_url`, `is_tenant`, `profile_change_requests`

### Email Handlers
- `/api/email/registration-approved`
- `/api/email/registration-rejected`
- `/api/email/vehicle-approved`
- `/api/email/vehicle-rejected`

### Code Quality
- 16 broken API route signatures fixed
- `badge.tsx`, `button.tsx` ref type fixed (forwardRef)
- `theme-provider.tsx` children prop fixed
- `tsc --noEmit` → **zero errors** (validated after every phase)

### Phase A — Admin Unified Verifications
- New `/admin/verifications` page (tabs: Payments | Vehicles | Registrations)
- `VerificationsPayments` + `VerificationsVehicles` extracted components
- Admin sidebar: combined `pendingVerifications` badge, Departments added, Payment Settings renamed
- Old `/admin/payments` + `/admin/vehicles` redirect to unified Verifications page
- `/api/admin/stats` returns `pendingVerifications` (payments + vehicle_requests)
- See `ADMIN_PORTAL_OVERHAUL_HANDOFF.md` for full details

### Phase B — Payment Settings (Dues Config + QR Codes)
- `upsertDuesConfig` + `getActiveDuesConfig` server actions (handles `UNIQUE(dues_year)`)
- `DuesConfigForm` client component
- `/admin/qr-codes` redesigned as unified Payment Settings page

### Phase C — Car Sticker Payment Wiring
- `bills/page.tsx` fetches approved `vehicle_requests` in parallel
- `PaymentModal`: vehicle selector for car_sticker payments, amount auto-fill, vehicleRequestId validation
- DB migration: `payments.vehicle_request_id uuid FK → vehicle_requests(id)`
- `/api/payments` POST persists `vehicle_request_id`

### Phase D — Applications Page (Real Pending Tracker)
- `app/applications/page.tsx` rewritten as server-rendered real-time pending tracker
- Shows vehicle request statuses + payment submission statuses with animated badges
- Register Vehicle CTA linking to `/vehicles`

---

## 🔴 Remaining (Priority Order)

### Phase F — Admin Departments + Dept Portal Polish
- [ ] DB migration: add `last_login_at timestamptz` to `departments`
- [ ] `api/admin/departments/route.ts` GET — include `description`, `portal_password_updated_at`, `last_login_at`, issue count
- [ ] `api/admin/departments/[id]/route.ts` PATCH — add `description` field
- [ ] `api/dept/session/login/route.ts` — stamp `last_login_at = now()` on successful login
- [ ] Redesign `app/admin/departments/page.tsx` — premium dept cards: description, email chips, issue count, last login, password staleness indicator
- [ ] Apply NEVHA glassmorphism to `app/dept/login/page.tsx`
- [ ] Upgrade `app/dept/(protected)/issues/page.tsx` — premium cards, status tabs, transitions
- [ ] Upgrade `app/dept/(protected)/issues/[id]/page.tsx` — timeline view for status updates

### Phase G — End-to-End QA
- [ ] Browser test: Unified Verifications page (3 tabs, real data)
- [ ] Browser test: Payment Settings (dues config + QR codes save/persist)
- [ ] Browser test: Bills → Pay Now → Car Sticker → vehicle selector → full submit flow
- [ ] Browser test: Applications page shows real vehicle request + payment statuses
- [ ] Browser test: Dept portal login + issue list + issue detail
- [ ] Run Supabase security advisor (RLS audit on new `vehicle_request_id` column)

### Backlog
- Admin Name Change Reviews page (`/admin/profile-changes` — table exists, no UI)
- Profile photo UI (`/profile` page — upload button missing; backend `/api/profile/photo` is ready)
- RLS audit: `profile_change_requests`, `hoa_dues`, `stickers`, new `payments.vehicle_request_id`
