# API Reference

The application exposes a set of API routes (`/app/api`) handling authentication, data retrieval, and administrative actions. All API routes are built using Next.js App Router handlers and interact with Supabase.

## Authentication & Session

### `POST /api/auth/sync`
Synchronizes the client-side Supabase session with the server-side HTTP-only cookie.
*   **Request**: `{ access_token, refresh_token }`
*   **Response**: `200 OK` (Set-Cookie header)

## Public / Resident APIs

### `GET /api/announcements`
Fetches published announcements for the public feed.
*   **Query Params**: None (filters by date automatically).
*   **Response**: JSON array of announcements.

### `GET /api/residents/search`
Searches for homeowners to verify identity before submitting reports.
*   **Query Params**: `q` (Name search string, min 3 chars).
*   **Response**: LIST of matching residents with a **signed token**.
*   **Security**: Returns a signed JWT-like token used to prove identity in `POST /api/report`.

### `POST /api/report`
Submits a new issue/concern to the HOA.
*   **Request**: 
    *   `verified_resident_token`: Token from `/api/residents/search`.
    *   `title`, `description`, `category`, `priority`.
    *   `reporter_*`: Contact details.
*   **Response**: `{ ref_code: "REF-XXXX" }` on success.
*   **Verification**: Validates the token signature and matches the reporter name.

## Admin APIs (`/api/admin/*`)
Protected routes accessible only to `admin` or `staff` roles.

### `GET /api/admin/stats`
Returns data for the admin dashboard (counts of users, issues, vehicles, etc.).

### `POST /api/admin/create-user`
Creates a new user account (Admin/Staff) and sends an invite/password setup email.

### `POST /api/admin/announcements`
Creates a new announcement.

### `PATCH /api/admin/issues/[id]`
Updates an issue's status, assignment, or details.
