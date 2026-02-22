# NEVHA Admin Portal Overhaul — Phases A–D Handoff

*Last updated: 2026-02-22*

This document describes the architectural changes made during the NEVHA app overhaul Phases A–D.
`tsc --noEmit` passes with **zero errors** after all these changes.

---

## Phase A: Unified Admin Verifications

### Problem
- Admin sidebar had separate "Vehicles" and "Payments" nav items pointing to independent pages.
- No unified view for all pending verification items.

### What Changed

#### `components/admin/admin-shell.tsx`
- `PendingCounts` interface updated — removed `pendingVehicleRequests` + `pendingPayments`, replaced with `pendingVerifications` (combined).
- `NAV_ITEMS` restructured:
  - Removed: `Vehicles`, `Payments`
  - Added: `Verifications` (href `/admin/verifications`, badge `pendingVerifications`)
  - Added: `Departments` (href `/admin/departments`, icon `Building2`)
  - Renamed: `QR Codes` → `Payment Settings`

#### `app/api/admin/stats/route.ts`
- Added `pendingVerifications` to stats response: `pendingPayments + pendingVehicleRequests`
- Kept individual counts for any existing consumers.

#### `app/admin/verifications/page.tsx` *(new)*
- Server component that fetches all 3 queues in parallel (payments, vehicle requests, registrations).
- Renders a tabbed layout: **Payments | Vehicles | Registrations**
- Accepts `?tab=` query param for deep-linking from old redirects.

#### `components/admin/verifications-payments.tsx` *(new)*
- Extracted from old `admin/payments` page.
- Renders pending payments table with verify/reject actions.
- Uses `/api/admin/payments/[id]/verify` API route.

#### `components/admin/verifications-vehicles.tsx` *(new)*
- Extracted from old `admin/vehicles` page.
- Renders pending vehicle request cards with approve/reject actions.
- Uses `/api/admin/vehicles/[id]/approve` and `/api/admin/vehicles/[id]/reject` API routes.

#### `app/admin/payments/page.tsx`
- Replaced with: `redirect('/admin/verifications?tab=payments')`

#### `app/admin/vehicles/page.tsx`
- Replaced with: `redirect('/admin/verifications?tab=vehicles')`

---

## Phase B: Payment Settings Page (Dues Config + QR Codes)

### Problem
- `hoa_dues_config` existed in DB but there was no admin UI to manage it.
- Car sticker price was hardcoded in the frontend.

### What Changed

#### `app/admin/qr-codes/actions.ts`
Added two new server actions:

- **`getActiveDuesConfig()`** — fetches the most recent active `hoa_dues_config` row.
- **`upsertDuesConfig(formData)`** — updates existing row if the same `dues_year` exists (handles `UNIQUE(dues_year)` constraint), otherwise deactivates others and inserts. Fields: `annual_amount`, `car_sticker_price`, `dues_year`, `due_date`.

#### `components/admin/dues-config-form.tsx` *(new)*
- Client component with a form for managing dues/sticker pricing.
- Uses `useTransition` (with `void` wrapper) for non-blocking server action.
- Toasts on success/error.

#### `app/admin/qr-codes/page.tsx`
- Renamed conceptually to "Payment Settings" (still served at `/admin/qr-codes`).
- Two sections: **Dues & Pricing** (new `DuesConfigForm`) above, **Payment Methods / QR Codes** (existing `QRCodeList`) below.
- Fetches both data streams in parallel in the server component.

---

## Phase C: Bills Page — Car Sticker Payment Wiring

### Problem
- Car sticker payment existed as a `fee_type` option but users had no way to link it to a specific vehicle.
- `payments` table had no FK to `vehicle_requests`.

### DB Migration Applied
```sql
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS vehicle_request_id uuid
  REFERENCES public.vehicle_requests(id) ON DELETE SET NULL;
```

### What Changed

#### `app/bills/page.tsx`
- Added 4th parallel fetch: `vehicle_requests` filtered by `user_id = auth.user.id` and `status = 'approved'`.
- Passes `approvedVehicles` array to `BillsContent`.

#### `app/bills/bills-content.tsx`
- `BillsContentProps` updated to include `approvedVehicles`.
- `BillsContent` destructures and passes `approvedVehicles` to `PaymentModal`.

#### `components/payments/payment-modal.tsx`
- `PaymentModalProps` updated — new optional prop: `approvedVehicles[]`
- New state: `vehicleRequestId` (string)
- **Details step** when `feeType === 'car_sticker'`: shows a native `<select>` listing each approved vehicle with `vehicle_type`, `plate_number`, and `sticker_price`. Selecting a vehicle auto-fills the amount.
- Validation: if user has approved vehicles and `feeType === 'car_sticker'`, they must select a vehicle before advancing.
- `vehicleRequestId` is spread into the payment creation payload (optional).

#### `app/api/payments/route.ts`
- `POST` handler now destructures `vehicleRequestId` from the request body.
- Spreads `{ vehicle_request_id: vehicleRequestId }` into the Supabase insert when present.

---

## Phase D: Applications Page — Real Pending Tracker

### Problem
- `app/applications/page.tsx` contained placeholder content.
- Users had no way to track the status of their vehicle requests or payment submissions in one place.

### What Changed

#### `app/applications/page.tsx` *(full rewrite)*
- Server component with `export const dynamic = 'force-dynamic'`.
- Fetches in parallel:
  - `vehicle_requests` (all, ordered by `created_at DESC`) filtered by `user_id`
  - `payments` (last 10, statuses `pending|verified|rejected`) filtered by `homeowner_id`
- Renders two iOS-style card sections:
  - **Vehicle Registrations** — each request shows vehicle type, plate number, submission date, sticker price, and animated status badge (Pending / Approved / Rejected).
  - **Payment Submissions** — each payment shows fee type, year, amount, date, and status badge.
- Empty states with Register Vehicle CTA (links to `/vehicles`).
- Header "Register Vehicle" shortcut button.

---

## DB State After Phases A–D

| Table | Change |
|---|---|
| `payments` | +`vehicle_request_id uuid FK → vehicle_requests(id)` |
| `hoa_dues_config` | No structural change; existing `car_sticker_price` column confirmed |
| `vehicle_requests` | No structural change; existing `status` enum used |

---

## Key File Map

| File | Role |
|---|---|
| `app/admin/verifications/page.tsx` | Unified verifications hub (tabs: payments, vehicles, registrations) |
| `components/admin/verifications-payments.tsx` | Payment verify/reject UI |
| `components/admin/verifications-vehicles.tsx` | Vehicle approve/reject UI |
| `components/admin/admin-shell.tsx` | Sidebar with combined `pendingVerifications` badge |
| `app/admin/qr-codes/page.tsx` | Payment Settings (dues config + QR codes) |
| `app/admin/qr-codes/actions.ts` | Server actions: `upsertDuesConfig`, `getActiveDuesConfig` |
| `components/admin/dues-config-form.tsx` | Dues config form client component |
| `app/bills/page.tsx` | Fetches approved vehicles for car sticker payment |
| `app/bills/bills-content.tsx` | Passes `approvedVehicles` to `PaymentModal` |
| `components/payments/payment-modal.tsx` | Vehicle selector + `vehicleRequestId` in car sticker payment |
| `app/api/payments/route.ts` | Persists `vehicle_request_id` on payment insert |
| `app/applications/page.tsx` | Real pending tracker (vehicle requests + payments) |

---

## How to Test

1. **Admin Sidebar** — `/admin` → verify: Verifications badge, Departments link, Payment Settings (no separate Vehicles/Payments).
2. **Verifications Page** — `/admin/verifications` → switch tabs, confirm data loads in each.
3. **Payment Settings** — `/admin/qr-codes` → fill dues config form → save → refresh → values persist.
4. **Car Sticker Payment** — log in as homeowner with an approved vehicle request → `/bills` → Pay Now → Car Sticker → vehicle dropdown appears, amount auto-fills → proceed through flow.
5. **Applications** — `/applications` as homeowner → see vehicle request status badges + recent payment statuses.

---

## Remaining Work (Phases F–G)

See `TASK_LIST.md` Phase F and Phase G sections.

Phase F: Admin Department Management Enhancement + Dept Portal Polish
Phase G: End-to-end QA browser testing
