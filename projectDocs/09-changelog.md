# Changelog

## [2026-02-17] - Security Fix: Persistent Admin Session

### Fixed
- **Critical Vulnerability**: Fixed an issue where logging out did not properly invalidate the session cookie, allowing unauthorized access to protected `/admin` routes via manual navigation.
- **Logout Mechanism**: Implemented a "Triple-Layer" logout strategy to ensure robust session termination:
    1.  **Client-Side Cookie Nuke**: Manually deletes `sb-...-auth-token` cookies with expired timestamps and root path.
    2.  **Supabase SignOut**: Revokes the current session token via `supabase.auth.signOut()`.
    3.  **Server-Side Cookie Cleanup**: A dedicated `signOutAction` actively searches for and deletes Supabase auth cookies on the server, enforcing a `path: '/'` scope.

### Changed
- **Authentication Hook**: Updated `hooks/use-auth.tsx` to include manual DOM cookie deletion logic before calling Supabase methods.
- **Server Actions**: Enhanced `app/auth/actions.ts` to iterate over all cookies and aggressively delete any matching the Supabase token pattern.

### Verified
- **Browser Testing**: Verified with automated browser tests that access to `/admin` is correctly denied (redirects to `/auth`) after logout.
