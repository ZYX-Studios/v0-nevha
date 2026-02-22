# Phase 12: Bug Fix Batch — Build Notes

Status: **COMPLETE** (2026-02-21)
Owner: Engineering

---

## Summary of Fixes

### Group 1: P1 — Structural Bugs

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 1 | BottomNav shows on `/admin` + `/dept` | `bottom-nav.tsx` only hid on `/auth` and `/onboarding` | Added `/admin` and `/dept` to the hide list |
| 2 | Hardcoded "Rob" on home greeting | `app/page.tsx:126` static string | Fetches homeowner `firstName` from `GET /api/profile`; falls back to email prefix |
| 3 | Registration approve: `null value in column "property_address"` | `homeowners.property_address` is NOT NULL; column wasn't populated on insert | Compute `property_address = "Phase X, Block Y, Lot Z"` from `claimed_*` fields before insert |
| 4 | Registration approve: no duplicate-address warning | No address-conflict check in approve route | Added query: if another homeowner with same phase/block/lot already has a `user_id`, return 409 with `error: "duplicate_address"` and `existingHomeownerName` |
| 5 | Admin user role downgraded to HOMEOWNER on approve | Status check missing before `role = HOMEOWNER` update | Fetch current role first; skip update if role is `ADMIN` or `STAFF` |

### Group 2: Profile

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 6 | Profile photo doesn't update after upload | Browser cache serves old image | API now returns cache-busted `{proxyUrl}&t={timestamp}` URL; DB stores canonical URL |
| 7 | Household members — RLS error on add/delete | `member-list.tsx` used browser Supabase client, blocked by new RLS policies | Created `/api/profile/members` (GET/POST/DELETE) using admin client with ownership verification; rewrote `MemberList` to call the API |
| 8 | Email change enabled in profile modal | `edit-profile-modal.tsx` had editable `email` input | Email field is now `readOnly` + `disabled` with explanatory note: "Email is linked to your login" |
| 9 | Home page `GET /api/profile` — no GET endpoint | `/api/profile/route.ts` only had PATCH | Added `GET /api/profile` returning the homeowner record (used for firstName greeting) |

### Group 3: Registration Flow — Identity Validation

| # | # | Root Cause | Fix |
|---|---|---|---|
| 10 | No feedback when existing email tries to register | Supabase threw "already registered" error; app showed generic alert | Registration form detects this error, shows a **phone-validation dialog** — user enters last 4 digits of their registered phone to confirm identity |
| — | New endpoint | — | `POST /api/auth/verify-phone` — validates `{email, phone_last4}` against homeowner record (admin client). Returns `{valid, maskedPhone, firstName}`. Never exposes full phone. |
| — | Outcome | — | If phone validates → user is shown masked phone + directed to Sign In (their account already exists). If not → clear error. |

### Group 4: Admin UX

| # | Bug | Root Cause | Fix |
|---|---|---|---|
| 11 | Registration sidebar badge doesn't update after approve/reject | `AdminShell` only re-fetched counts on route change | Added `window.addEventListener('admin-counts-refresh', ...)` in `AdminShell`; `RegistrationsTable` dispatches `new CustomEvent('admin-counts-refresh')` on success |
| 12 | Browser `alert()` on approve/reject errors | Legacy `alert()` calls in `RegistrationsTable` | Replaced with `toast.error` / `toast.success` via sonner |
| 13 | No user-facing message when address already taken | No UI handling for the new 409 | `RegistrationsTable.handleApprove` now shows `toast.warning` with the conflict message; dialog stays open so admin can pick a different match |

---

## New Files

| File | Purpose |
|---|---|
| `app/api/profile/members/route.ts` | GET/POST/DELETE household members via admin client |
| `app/api/auth/verify-phone/route.ts` | Phone last-4 validation for existing-email registration |

## Modified Files

| File | Change |
|---|---|
| `components/ui/bottom-nav.tsx` | Hide on `/admin` and `/dept` |
| `app/page.tsx` | Dynamic first name in greeting |
| `app/api/profile/route.ts` | Added GET endpoint; removed email from PatchSchema |
| `app/api/profile/photo/route.ts` | Cache-busted URL in response |
| `app/api/admin/registrations/[id]/approve/route.ts` | property_address computation, duplicate-address 409, admin role guard |
| `components/profile/member-list.tsx` | Uses `/api/profile/members` API instead of browser Supabase client |
| `components/profile/edit-profile-modal.tsx` | Email field locked; removed email from PATCH payload |
| `components/auth/register-form.tsx` | Phone-validation dialog on existing-email error |
| `components/admin/admin-shell.tsx` | `CustomEvent('admin-counts-refresh')` listener |
| `components/admin/registrations-table.tsx` | Toast-based errors, 409 duplicate-address handling, counts-refresh dispatch |

---

## Deferred Items

| Item | Reason |
|---|---|
| `/dept` portal (CRUD + issue routing) | New module — defer to dedicated sprint |
| Announcements UI rich-text overhaul | Requires markdown editor library decision |
| QR Code / Payment setup cropper | Requires canvas-based cropper library |
| Issues list pagination | Requires API + UI changes (separate sprint) |
| Cache issues investigation | Likely service-worker related; clear via dev mode SW unregister script in `layout.tsx` |
