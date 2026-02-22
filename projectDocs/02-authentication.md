# Authentication

## Overview
Authentication is handled via **Supabase Auth**, integrated deeply into the Next.js application using `@supabase/ssr`. This allows for secure session management across both server-side and client-side environments.

## Auth Flow

### 1. Middleware Protection
The `middleware.ts` file is the first line of defense.
- **Session Refresh**: It calls `updateSession` to ensure the auth token is valid and refreshes it if necessary.
- **Route Guarding**:
    - **Public Routes**: accessible to everyone (e.g., Home, Login, Public API).
    - **Admin Routes**: (`/admin/*`) require the user to be authenticated AND have an `ADMIN` or `STAFF` role.
    - **Protected Routes**: Redirect unauthenticated users to `/auth`.

### 2. Client-Side Context (`useAuth`)
The `AuthProvider` in `hooks/use-auth.tsx` manages the global auth state for the client.
- **Session Management**: Automatically listens to Supabase auth state changes (`onAuthStateChange`) and triggers `router.refresh()` to update Server Components.
- **User Data**: Fetches additional user profile data from the `users` table (like role, phone number) upon sign-in.
- **Secure Logout**: Implements a "Triple-Layer" logout strategy:
    1.  **Client-Side Cookie Nuke**: Manually clears browser cookies including `sb-...-auth-token`.
    2.  **Supabase SignOut**: Revokes the current session token via SDK.
    3.  **Server Action**: Calls `signOutAction` to enforce cookie deletion on the server response.

### 3. User Roles
Roles are stored in the `users` table in the database, not just in Supabase Auth metadata.
- **ADMIN**: Full access to the Admin Dashboard.
- **STAFF**: Limited access to admin features (configurable).
- **HOMEOWNER**: Standard user access (reporting issues, viewing private announcements).

### 4. Department Portal
There is a separate, distinct auth flow for "Departments" (`/dept`) which seems to use a custom cookie-based session (`dept_session`) or separate logic, distinct from the main homeowner/admin auth.

## Key Files
- `middleware.ts`: Global route protection.
- `lib/supabase/middleware.ts`: Middleware-specific Supabase client.
- `hooks/use-auth.tsx`: React context for auth state.
- `app/auth/actions.ts`: Server Actions for secure authentication operations (e.g., signOut).

---

## Authentication UI Redesign
The authentication interface has been core-redesigned to follow a **Premium iOS Utility** aesthetic:
- **Consolidated Entry:** `app/auth/page.tsx` handles both Login and Registration with fluid `framer-motion` transitions.
- **Brand Identity:** The official **NEVHA logo** (`/NEVHA logo.svg`) is used across all auth screens, replacing generic icons.
- **Glassmorphism:** Containers use `backdrop-blur-3xl` and `bg-white/80` for a modern, high-fidelity look.
- **Direct Access:** Standalone routes (`/auth/login`, `/auth/sign-up`) redirect users to the consolidated page with appropriate mode parameters.
- **Forgot Password:** A dedicated flow (`/auth/forgot-password`) that matches the main app's premium light theme.
