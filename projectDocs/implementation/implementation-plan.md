# NEVHA Site Upgrade — Refined Implementation Plan

## Summary

Enable online self-service for homeowners: account creation with DB matching, digital payments with proof upload, real-time billing with arrears, vehicle registration, and admin verification workflows.

> [!IMPORTANT]
> **Key decisions from investigation (revised from v1):**
> 1. **Extend `hoa_dues_config`** — add `car_sticker_price` column (not a separate `fee_config` table). Zero impact on existing RPCs (`record_hoa_payment`, `get_dues_summary`, `get_homeowners_with_dues_status`) and admin UI.
> 2. **Google Drive for storage** — payment proofs upload to Google Drive via service account, store Drive file URL in DB. Keeps Supabase storage under 1GB limit.
> 3. **No `/dashboard` route** — the existing app at `/` IS the customer portal (BottomNav: Home, Updates, Services, Bills, Profile). Enhance existing pages instead.
> 4. **Future fees** — schema designed to accommodate water, garbage, cleaning fees later via additional columns on `hoa_dues_config`.

---

## User Review Required

> [!WARNING]
> **Google Drive setup** — You will need to:
> 1. Create a Google Cloud project and enable the Drive API
> 2. Create a service account and download the JSON key
> 3. Create a shared Drive folder and share it with the service account email
> 4. Add 3 env vars: `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

> [!IMPORTANT]
> **QR code storage** — Admin-uploaded QR codes (GCash/bank) are small (~50KB each) and rarely change. These stay in Supabase Storage (`qr-codes` bucket, public). Only payment proof images go to Google Drive.

---

## Proposed Changes

### Phase 1: Database Migrations

#### [MODIFY] `hoa_dues_config` table (via migration)

Add `car_sticker_price` column to existing table:

```sql
ALTER TABLE hoa_dues_config
  ADD COLUMN car_sticker_price NUMERIC DEFAULT 0;
```

**Why extend instead of new table:**
- `record_hoa_payment` RPC reads `annual_amount` from `hoa_dues_config` — unchanged
- `get_dues_summary` RPC joins `hoa_dues_config` — unchanged
- Admin dues page and API routes read from `hoa_dues_config` — unchanged
- Car sticker price is a per-year config, same granularity as annual dues

#### [NEW] `payments` table

Tracks all online payment submissions (proof uploads):

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES homeowners(id),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('annual_dues', 'car_sticker')),
  fee_year INT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('gcash', 'bank_transfer', 'cash', 'check')),
  proof_url TEXT,                    -- Google Drive URL
  proof_drive_file_id TEXT,          -- Google Drive file ID (for deletion/management)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] `payment_qr_codes` table

Admin-managed QR codes for GCash/bank transfer:

```sql
CREATE TABLE payment_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('gcash', 'bank_transfer')),
  label TEXT NOT NULL,               -- e.g., "NEVHA GCash", "BDO Savings"
  account_name TEXT,
  account_number TEXT,
  qr_image_url TEXT NOT NULL,        -- Supabase Storage URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] `registration_requests` table

Tracks homeowner registration attempts pending admin verification:

```sql
CREATE TABLE registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  claimed_block TEXT,
  claimed_lot TEXT,
  claimed_phase TEXT,
  matched_homeowner_id UUID REFERENCES homeowners(id),
  match_confidence TEXT CHECK (match_confidence IN ('high', 'low', 'none')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### [MODIFY] `users` role constraint

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'STAFF', 'DEPARTMENT', 'HOMEOWNER'));
```

#### [NEW] Supabase Storage buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `qr-codes` | **Public** | Admin-uploaded QR code images (~50KB each) |

> [!NOTE]
> Payment proofs go to Google Drive, NOT Supabase Storage. Only QR codes use Supabase Storage.

#### [NEW] RLS Policies

```sql
-- payments: homeowners see own, admins see all
-- payment_qr_codes: everyone reads active, admins write
-- registration_requests: user sees own, admins see all
```

---

### Phase 2: Account Creation & Matching

#### [NEW] `app/api/auth/register-homeowner/route.ts`

**Matching algorithm:**
1. Check `homeowners` table for email match → `high` confidence
2. Check (block + lot + phase + last_name) match → `high` confidence  
3. Partial matches → `low` confidence
4. No match → `none` confidence

- `high` → auto-approve, link `homeowners.user_id` to new `auth.users.id`
- `low`/`none` → create `registration_requests` entry, notify admin

#### [MODIFY] `app/auth/page.tsx`

Add homeowner registration tab with fields: first name, last name, email, phone, block, lot, phase.

#### [MODIFY] `hooks/use-auth.tsx`

- Add `registerHomeowner()` function
- Add `homeownerProfile` to session state (fetched from `homeowners` where `user_id = auth.uid`)
- Add `registrationStatus` field

#### [MODIFY] `lib/supabase/middleware.ts`

- Protect `/bills`, `/profile` for authenticated homeowners
- Keep `/`, `/announcements`, `/applications`, `/report`, `/status` public

---

### Phase 3: Payment Flow & Google Drive Integration

#### [NEW] `lib/google-drive.ts`

Server-side utility using `googleapis` package:

```typescript
// uploadPaymentProof(file: Buffer, fileName: string): Promise<{ url: string, fileId: string }>
// deletePaymentProof(fileId: string): Promise<void>
```

- Uses service account credentials from env vars
- Uploads to shared folder specified by `GOOGLE_DRIVE_FOLDER_ID`
- Returns public viewable URL + file ID

#### [NEW] `lib/image-compression.ts`

Client-side utility using `browser-image-compression`:

```typescript
// compressPaymentProof(file: File): Promise<File>
// Max 1MB output, max 1920px dimension, reject >5MB raw input
```

#### [NEW] `components/payments/payment-modal.tsx`

Full-screen iOS-style modal:
1. Select fee type (Annual Dues / Car Sticker)
2. Select payment method → show relevant QR code
3. Upload compressed proof image
4. Submit → creates `payments` row with `pending` status

#### [NEW] `app/api/payments/route.ts`

- `GET` — fetch user's payment history
- `POST` — create payment + upload proof to Google Drive

#### [NEW] `app/api/payments/upload-proof/route.ts`

- Receives compressed image from client
- Uploads to Google Drive via service account
- Returns `{ url, fileId }` for storage in `payments` row

---

### Phase 4: Bills Page Rewrite

#### [MODIFY] `app/bills/page.tsx`

Replace static mockup with:
- Fetch real data from `hoa_dues` + `hoa_dues_config` for logged-in homeowner
- Show current year dues status + car sticker fees
- **Arrears section** — calculate unpaid years by checking all years from homeowner's `created_at` year to current year
- "Pay Now" button opens payment modal
- Payment history timeline (from `payments` table)

#### [NEW] `lib/arrears.ts`

```typescript
// calculateArrears(homeownerId, hoaDuesRecords, configRecords): ArrearsSummary
// Returns: { totalOwed, yearBreakdown: [{year, type, amount, status}] }
```

---

### Phase 5: Profile Page Rewrite

#### [MODIFY] `app/profile/page.tsx`

Replace static mockup with:
- Real homeowner data (name, address, block/lot/phase, membership status)
- Good standing badge (from `get_good_standing_status` RPC)
- Registered vehicles list (from `car_stickers` table)
- Link to vehicle registration
- Account settings (password change, etc.)

---

### Phase 6: Admin Panels

#### [NEW] `app/admin/payments/page.tsx`

Queue of pending payment proofs:
- View proof image (Drive URL), amount, homeowner details
- Approve → update `payments.status`, call `record_hoa_payment` RPC to credit the dues
- Reject → update status + admin notes

#### [NEW] `app/admin/qr-codes/page.tsx`

- Upload/manage QR code images (stored in Supabase `qr-codes` bucket)
- Toggle active/inactive
- CRUD for payment methods with labels

#### [NEW] `app/admin/registrations/page.tsx`

- View pending registration requests
- Match to homeowner records manually
- Approve (link user) or reject

#### [MODIFY] `app/admin/page.tsx`

Add Quick Action buttons:
- "Payment Queue" → `/admin/payments`
- "QR Codes" → `/admin/qr-codes`  
- "Registrations" → `/admin/registrations`

#### [MODIFY] `app/api/admin/dues/config/route.ts`

Add `car_sticker_price` to the POST body and upsert logic.

#### [MODIFY] `app/admin/dues/page.tsx`

Add car sticker price field to the config display section.

---

### Phase 7: Vehicle Registration

#### [NEW] `app/vehicles/page.tsx`

- List homeowner's registered vehicles (from `car_stickers` table)
- Register new vehicle form
- View sticker status

#### [NEW] `app/api/vehicles/register/route.ts`

- Creates entry in `car_stickers` table
- Auto-generates sticker assignment or marks as pending

---

### Phase 8: NPM Dependencies & Shared Utilities

#### [MODIFY] `package.json`

New dependencies:
- `browser-image-compression` — client-side image compression
- `googleapis` — Google Drive API for server-side proof uploads

#### [MODIFY] `lib/types.ts`

Add interfaces: `Payment`, `PaymentQrCode`, `RegistrationRequest`, `ArrearsSummary`

---

## Verification Plan

### Automated (Browser Agent)

| Test | Steps |
|------|-------|
| Homeowner registration | Register new user → verify matching logic → check DB |
| Payment upload | Login → Bills → Pay Now → upload proof → verify Drive URL in DB |
| Admin payment verification | Login as admin → Payment Queue → approve → verify `hoa_dues` updated |
| Bills arrears display | Login as homeowner with unpaid years → verify arrears calculation |
| QR code management | Admin → QR Codes → upload → verify Supabase Storage URL |

### Manual

- Verify Google Drive folder permissions (uploaded files accessible, storage not exceeding limits)
- Test image compression at various file sizes (100KB, 1MB, 5MB, 10MB)
- Check BottomNav visibility on all new/modified pages
- Mobile responsiveness on iPhone Safari / Android Chrome
