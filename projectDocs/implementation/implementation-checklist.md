# NEVHA Site Upgrade — Implementation Checklist

## Phase 1: Database Migrations
- [x] Extend `hoa_dues_config` — add `car_sticker_price` column
- [x] Create `payments` table (with `proof_drive_file_id` for Google Drive)
- [x] Create `payment_qr_codes` table
- [x] Create `registration_requests` table
- [x] Alter `users` role constraint (add `HOMEOWNER`)
- [x] Create `qr-codes` Supabase Storage bucket + RLS
- [x] Add RLS policies for all new tables

## Phase 2: Account Creation & Matching
- [x] Create `/api/auth/register-homeowner` API route
- [x] Update auth page with homeowner registration flow
- [x] Update `use-auth.tsx` with `registerHomeowner()` + homeowner context
- [x] Update middleware for protected routes (`/bills`, `/profile`)

## Phase 3: Payment Flow & Google Drive
- [x] Install `googleapis` + `browser-image-compression`
- [x] Create `lib/google-drive.ts` server utility
- [x] Create `lib/image-compression.ts` client utility
- [x] Create `components/payments/payment-modal.tsx`
- [x] Create `/api/payments/route.ts` (GET/POST)
- [x] Create `/api/payments/upload-proof/route.ts` (Google Drive upload)

## Phase 4: Bills Page Rewrite
- [x] Create `lib/arrears.ts` utility
- [x] Rewrite `/bills/page.tsx` with real data + arrears + payment modal

## Phase 5: Profile Page Rewrite
- [x] Rewrite `/profile/page.tsx` with real homeowner data + vehicles

## Phase 6: Admin Panels
- [x] Create `/admin/payments/page.tsx` (verification queue)
- [x] Create `/admin/qr-codes/page.tsx` (QR manager)
- [x] Create `/admin/registrations/page.tsx` (registration queue)
- [x] Create admin API routes for payments, QR codes, registrations
- [x] Update admin dashboard Quick Actions
- [x] Update admin dues config API + page for car sticker price

## Phase 7: Vehicle Registration
- [x] Create `/vehicles/page.tsx`
- [x] Create `/api/vehicles/register/route.ts`

## Phase 8: Types & Verification
- [x] Update `lib/types.ts` with new interfaces
- [x] End-to-end browser verification

## Phase 1: Database Migrations
- [ ] Extend `hoa_dues_config` — add `car_sticker_price` column
- [ ] Create `payments` table (with `proof_drive_file_id` for Google Drive)
- [ ] Create `payment_qr_codes` table
- [ ] Create `registration_requests` table
- [ ] Alter `users` role constraint (add `HOMEOWNER`)
- [ ] Create `qr-codes` Supabase Storage bucket + RLS
- [ ] Add RLS policies for all new tables

## Phase 2: Account Creation & Matching
- [ ] Create `/api/auth/register-homeowner` API route
- [ ] Update auth page with homeowner registration flow
- [ ] Update `use-auth.tsx` with `registerHomeowner()` + homeowner context
- [ ] Update middleware for protected routes (`/bills`, `/profile`)

## Phase 3: Payment Flow & Google Drive
- [ ] Install `googleapis` + `browser-image-compression`
- [ ] Create `lib/google-drive.ts` server utility
- [ ] Create `lib/image-compression.ts` client utility
- [ ] Create `components/payments/payment-modal.tsx`
- [ ] Create `/api/payments/route.ts` (GET/POST)
- [ ] Create `/api/payments/upload-proof/route.ts` (Google Drive upload)

## Phase 4: Bills Page Rewrite
- [ ] Create `lib/arrears.ts` utility
- [ ] Rewrite `/bills/page.tsx` with real data + arrears + payment modal

## Phase 5: Profile Page Rewrite
- [ ] Rewrite `/profile/page.tsx` with real homeowner data + vehicles

## Phase 6: Admin Panels
- [ ] Create `/admin/payments/page.tsx` (verification queue)
- [ ] Create `/admin/qr-codes/page.tsx` (QR manager)
- [ ] Create `/admin/registrations/page.tsx` (registration queue)
- [ ] Create admin API routes for payments, QR codes, registrations
- [ ] Update admin dashboard Quick Actions
- [ ] Update admin dues config API + page for car sticker price

## Phase 7: Vehicle Registration
- [ ] Create `/vehicles/page.tsx`
- [ ] Create `/api/vehicles/register/route.ts`

## Phase 8: Types & Verification
- [ ] Update `lib/types.ts` with new interfaces
- [ ] End-to-end browser verification
