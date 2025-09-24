# Public Report: Resident Verification (Handoff)

Status: Implemented
Owner: Engineering
Last Updated: 2025-09-24

---

## Objective
Gate the public report form so only registered homeowners can submit, without adding a new login flow. Keep the UI simple: users type their name and select themselves from a subtle suggestion list (no PII exposed). The server enforces verification via a short token.

---

## Summary of Changes
- UI (`app/report/page.tsx`)
  - Full Name field now shows debounced suggestions (300ms) when typing ≥3 characters.
  - Selecting a suggestion sets a short-lived verification token, shows a green check inside the input, and enables Submit.
  - Editing the Full Name clears the verification (prevents stale tokens).
  - Warning text under the field: "Only registered homeowners can submit."
  - Offline queue includes the verification token; submissions without a token are rejected and legacy queue items without tokens are skipped on flush.

- API
  - `GET /api/residents/search` (public): Returns only name and a signed verification token for homeowners that match the query. No other fields returned.
  - `POST /api/report`: Requires `verified_resident_token` and enforces that the submitted `reporter_full_name` matches the token’s name. Returns 403 on missing/invalid/expired token or name mismatch.

- Middleware (`lib/supabase/middleware.ts`)
  - Treats `/api/residents` as public, like `/report` and `/status`.

---

## Endpoints & Contracts
### GET `/api/residents/search?q=<string>` (Public)
- Purpose: Provide minimal results to verify a resident by name.
- Input: `q` (string), minimum 3 characters.
- Output: `{ items: Array<{ name: string; token: string }> }`
  - `name`: Homeowner full name.
  - `token`: Signed verification token (see Token section).
- Behavior:
  - Case-insensitive search (`ILIKE`) across `homeowners.full_name`, `first_name`, `last_name`.
  - Returns only homeowners (members are excluded) and only the `name + token` pair.
  - Deduplicates by `name` and limits to 8 items.

### POST `/api/report` (Public)
- Requires `verified_resident_token` in the request body.
- Validates the token signature and expiry, and enforces that `reporter_full_name` equals the token’s `name` (case-insensitive).
- Continues with existing behavior (priority mapping, insert into `issues`, department linking, Resend email) on successful verification.
- Responds with `{ ref_code }` on success or appropriate errors (400/403/500).

---

## Token
- Format: `v1.<base64url(header)>.<base64url(payload)>.<base64url(sig)>`
- Header: `{ v: 1 }`
- Payload fields:
  - `t`: entity type (`"homeowner"`)
  - `id`: internal entity id (not used further in current flow)
  - `n`: full name (used to enforce name match)
  - `iat`: issued-at (ms)
  - `exp`: expiry (ms) — currently 24h to tolerate offline queue
- Signature: HMAC-SHA256 of `header.payload` using secret (see Env).

---

## Environment & Secrets
- Primary secret: `ADMIN_ACCESS_KEY` (already present in `.env`).
- Fallbacks supported by code: `RESIDENT_VERIFICATION_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` (not required when `ADMIN_ACCESS_KEY` is set).

---

## Data & Scope
- Source tables: `homeowners` only (members excluded) for the verification search.
- No PII (email/phone/address) is returned from search; only the display `name` and a signed `token` are returned to the client.

---

## UI Details (`app/report/page.tsx`)
- Debounced fetch to `/api/residents/search` after 300ms when `Full Name` length ≥3 and no token selected.
- Subtle dropdown under the input shows possible matches. Selecting a name:
  - Sets `selectedResidentToken` and updates `reporter_full_name` to the selected value.
  - Displays a green `CheckCircle` icon inside the input’s right side and enables submit.
- Editing the Full Name clears the verification token and disables submit again.
- Warning shown: "Only registered homeowners can submit."
- Offline queue stores `{ ...form, verified_resident_token }`. On flush, legacy items without the token are skipped; 403 responses are dropped to prevent retry loops.

---

## Security Considerations
- Enumeration: mitigated by min length (3), debouncing, and not advertising the search. Consider rate limiting if needed.
- No PII exposure: API returns only `name` and `token`.
- Server-side enforcement: `/api/report` strictly requires a valid token and name match.
- Token TTL: 24h; can be tuned if desired.

---

## Manual Test Plan
1) Navigate to `/report`.
2) Type at least 3 characters of a known homeowner’s name.
3) Select a suggestion; a green check appears in the input and submit is enabled.
4) Change the name text; the check disappears and submit is disabled until re-selected.
5) Submit online: should receive a `ref_code` and email should be sent to the mapped department.
6) Submit offline: after selecting your name, submit queues the report; when back online it uploads automatically.
7) Tamper in DevTools to remove or alter `verified_resident_token`: `/api/report` should return 403.

---

## Future Enhancements (Optional)
- Rate limit `/api/residents/search` to further reduce enumeration.
- Disambiguation for duplicate names (e.g., middle initials, non-sensitive hints) if needed.
- Persist and link `reporter_homeowner_id` in the `issues` table using the token’s internal `id` (currently not required).
- Consider a shorter token TTL and a UI re-verify prompt if submissions are delayed too long.
