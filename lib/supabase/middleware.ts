import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl
  const path = url.pathname

  // Department portal routes (password-gated, custom auth)
  const isDeptRoute = path.startsWith("/dept") || path.startsWith("/api/dept")
  if (isDeptRoute) {
    const isDeptPublic = path === "/dept/login" || path.startsWith("/api/dept/session") || path.startsWith("/api/dept/departments")
    if (!isDeptPublic) {
      const hasCookie = request.cookies.get("dept_session")?.value
      if (!hasCookie) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[mw] dept route missing cookie -> redirect to /dept/login", { path })
        }
        const dest = new URL(request.url)
        dest.pathname = "/dept/login"
        dest.search = ""
        return NextResponse.redirect(dest)
      }
    }
    // Allow dept routes regardless of Supabase auth
    return supabaseResponse
  }

  // Publicly accessible routes
  const isPublic =
    path === "/" ||
    // Auth
    path.startsWith("/auth") ||
    path.startsWith("/api/auth/sync") ||
    // Public reporting and status lookup
    path.startsWith("/report") || // e.g., /report
    path.startsWith("/status") || // e.g., /status/REF-XXXX
    path.startsWith("/api/report") ||
    path.startsWith("/api/status") ||
    // Public announcements (homepage section and dedicated page)
    path.startsWith("/announcements") ||
    path.startsWith("/api/announcements") ||
    path.startsWith("/api/departments") || // used by public report form for department options
    // Admin bootstrap endpoints kept public intentionally
    path.startsWith("/api/admin/create-user") ||
    path.startsWith("/api/admin/reset-password") ||
    path.startsWith("/api/admin/bootstrap") ||
    // PWA assets
    path === "/manifest.json" ||
    path === "/sw.js"

  // Admin/staff-only areas (keep simple: only /admin and /api/admin)
  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/api/admin")


  // Allow all public routes without requiring login (must come before admin gating)
  if (isPublic) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[mw] public route", { path, isPublic, hasUser: !!user })
    }
    return supabaseResponse
  }

  // For any other non-public route, if not authenticated, send to auth with redirect back
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[mw] non-public and no user -> redirect to /auth", { path })
    }
    const redirectTo = encodeURIComponent(url.pathname + (url.search || ""))
    const dest = new URL(request.url)
    dest.pathname = "/auth"
    dest.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(dest)
  }

  // Protect admin-only routes: authenticated but must be ADMIN/STAFF
  if (isAdminRoute) {
    // In development, bypass role checks to simplify local auth workflows
    if (process.env.NODE_ENV !== "production") {
      console.log("[mw] dev mode: skipping admin role check", { path, hasUser: !!user })
    } else {
      try {
        const { data: me } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle()
        const role = me?.role as string | undefined
        const allowed = role === "ADMIN" || role === "STAFF"
        if (process.env.NODE_ENV !== "production") {
          console.log("[mw] admin role check", { path, role, allowed })
        }
        if (!allowed) {
          const dest = new URL(request.url)
          dest.pathname = "/auth"
          dest.search = ""
          return NextResponse.redirect(dest)
        }
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.log("[mw] admin role check error -> redirect to /auth", { path })
        }
        const dest = new URL(request.url)
        dest.pathname = "/auth"
        dest.search = ""
        return NextResponse.redirect(dest)
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[mw] allow", { path, hasUser: !!user })
  }
  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
