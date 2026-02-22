# Database Schema

The application uses **Supabase (PostgreSQL)** as its primary database. The schema is designed to support the Homeowners Association (HOA) management features, including user authentication, resident profiles, issue tracking, and announcements.

## Core Tables

### `users`
This table extends the default Supabase `auth.users` with application-specific profile data.
*   **`id`** (UUID): Primary Key, references `auth.users`.
*   **`email`** (Text): User's email address.
*   **`first_name`** (Text): First name.
*   **`last_name`** (Text): Last name.
*   **`phone`** (Text, Optional): Contact number.
*   **`role`** (Enum): User role (`homeowner`, `admin`, `staff`).
*   **`is_active`** (Boolean): Account status.
*   **`created_at`**, **`updated_at`** (Timestamp).

### `homeowners`
Stores detailed information for residents/homeowners.
*   **`id`** (UUID): Primary Key.
*   **`user_id`** (UUID, Optional): Links to `users.id` if the resident has an account.
*   **`property_address`** (Text): Full address.
*   **`block`**, **`lot`**, **`phase`**, **`street`** (Text): Granular address components.
*   **`is_owner`** (Boolean): True if owning the property, False if tenant.
*   **`contact_number`** (Text): Phone number.
*   **`emergency_contact_name`**, **`emergency_contact_phone`** (Text): Emergency details.
*   **`move_in_date`** (Date).
*   **`residency_start_date`** (Date).

### `issues`
Tracks community concerns, reports, and maintenance requests.
*   **`id`** (UUID): Primary Key.
*   **`ref_code`** (Text): Unique user-facing reference code (e.g., `REF-ABC12345`).
*   **`reporter_id`** (UUID, Optional): Links to `users.id` if reported by a logged-in user.
*   **`title`** (Text): Issue summary.
*   **`description`** (Text): Detailed explanation.
*   **`category`** (Text): Issue category (e.g., Security, Maintenance, Noise).
*   **`priority`** (Enum): `P1` (Urgent), `P2` (High), `P3` (Normal), `P4` (Low).
*   **`status`** (Enum): `not_started`, `in_progress`, `on_hold`, `resolved`, `closed`.
*   **`location_text`** (Text): Specific location of the issue.
*   **`reporter_full_name`**, **`reporter_email`**, **`reporter_phone`**: Captured for guest/public reports.
*   **`assigned_to`** (UUID, Optional): Staff member assigned to the issue.
*   **`resolution_notes`** (Text): Notes on how the issue was resolved.

### `announcements`
Stores news and updates for the community.
*   **`id`** (UUID): Primary Key.
*   **`title`** (Text): Headline.
*   **`content`** (Text): Rich text or markdown content.
*   **`priority`** (Enum): `low`, `normal`, `high`, `urgent`.
*   **`is_published`** (Boolean): Visibility flag.
*   **`publish_date`** (Timestamp): Scheduled publication time.
*   **`expiry_date`** (Timestamp): Auto-archive time.
*   **`author_id`** (UUID): Links to `users.id`.

### `stickers` / `car_stickers`
Manages vehicle registration and sticker issuance.
*   **`id`** (UUID): Primary Key.
*   **`homeowner_id`** (UUID): Owner of the vehicle.
*   **`sticker_number`** / **`code`** (Text): Unique sticker ID.
*   **`vehicle_make`**, **`vehicle_model`**, **`vehicle_plate`**: Vehicle details.
*   **`status`** (Enum): `ACTIVE`, `EXPIRED`, `REVOKED`.
*   **`issued_at`**, **`expires_at`** (Timestamp).

## Enumerations (`enums`)
The database makes heavy use of PostgreSQL enums to enforce data integrity for fields like:
*   **`user_role`**: `admin`, `staff`, `homeowner`.
*   **`issue_priority`**: `P1`, `P2`, `P3`, `P4`.
*   **`issue_status`**: `not_started`, `in_progress`, `on_hold`, `resolved`, `closed`.
*   **`announcement_priority`**: `low`, `normal`, `high`, `urgent`.

## Row Level Security (RLS)
RLS is enabled on all tables to ensure data isolation and security.
*   **Users**: Can read/edit their own profile.
*   **Admins**: Have full access to all tables.
*   **Homeowners**: Can view their own issues, stickers, and public announcements.
*   **Public**: Can view published announcements (if configured) and submit issues via public forms (insert-only).
