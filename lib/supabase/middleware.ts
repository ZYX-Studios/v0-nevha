import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Routes that require a valid Supabase auth session (homeowner or admin).
 * Unauthenticated users are redirected to /auth.
 */
const MEMBER_PROTECTED_ROUTES = ["/bills", "/profile", "/vehicles", "/onboarding", "/refresh"]

/**
 * Routes that require ADMIN or STAFF role.
 * Unauthenticated users → /auth; authenticated non-admins → /
 */
const ADMIN_PROTECTED_PREFIX = "/admin"

/**
 * Routes that require a valid dept_session cookie.
 * Users without the cookie are redirected to /dept/login.
 */
const DEPT_PROTECTED_PREFIX = "/dept"

/** Public routes that bypass all auth checks */
const PUBLIC_ROUTE_PREFIXES = [
  "/auth",
  "/api/auth",
  "/api/report",
  "/api/status",
  "/api/announcements",
  "/api/residents",
  "/api/dept",
  "/dept/login",
  "/status",
  "/report",
  "/announcements",
]

/** Public API routes that bypass auth */
const PUBLIC_API_ROUTES = ["/api/departments"]

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() to refresh the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Dept Portal: cookie-based auth ──────────────────────────────────────────
  if (
    pathname.startsWith(DEPT_PROTECTED_PREFIX) &&
    !pathname.startsWith("/dept/login") &&
    !pathname.startsWith("/api/dept")
  ) {
    const deptSession = request.cookies.get("dept_session")
    if (!deptSession) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/dept/login"
      return NextResponse.redirect(loginUrl)
    }
    return supabaseResponse
  }

  // ── Skip auth checks for public routes ──────────────────────────────────────
  const isPublic =
    pathname === "/" ||
    pathname === "/emergency" ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))

  if (isPublic) {
    return supabaseResponse
  }

  // ── Admin routes: require ADMIN or STAFF role ────────────────────────────────
  if (pathname.startsWith(ADMIN_PROTECTED_PREFIX)) {
    if (!user) {
      const authUrl = request.nextUrl.clone()
      authUrl.pathname = "/auth"
      authUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(authUrl)
    }

    // Verify role via DB (anon client uses RLS — users can read their own row)
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = dbUser?.role
    if (role !== "ADMIN" && role !== "STAFF") {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = "/"
      return NextResponse.redirect(homeUrl)
    }

    return supabaseResponse
  }

  // ── Member-protected routes: require any authenticated session ───────────────
  const isMemberProtected = MEMBER_PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (isMemberProtected && !user) {
    const authUrl = request.nextUrl.clone()
    authUrl.pathname = "/auth"
    authUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(authUrl)
  }

  return supabaseResponse
}
