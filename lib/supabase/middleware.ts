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

  // Publicly accessible routes (no login required)
  const isPublic =
    path === "/" ||
    path.startsWith("/announcements") ||
    path.startsWith("/report") ||
    path.startsWith("/status") ||
    path.startsWith("/api/report") ||
    path.startsWith("/api/status") ||
    path.startsWith("/api/admin/create-user") ||
    path === "/manifest.json" ||
    path === "/sw.js"

  // Admin/staff-only areas
  const isAdminRoute = path.startsWith("/admin") || path.startsWith("/dashboard") || path.startsWith("/api/admin")

  // Optionally gate /auth behind a secret key if provided
  if (path.startsWith("/auth")) {
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey) {
      const key = url.searchParams.get("key")
      if (key !== requiredKey) {
        const redirectUrl = url.clone()
        redirectUrl.pathname = "/"
        redirectUrl.search = ""
        return NextResponse.redirect(redirectUrl)
      }
    }
    // Allow /auth when key requirement passes (or not configured)
    return supabaseResponse
  }

  // Allow all public routes without requiring login (must come before admin gating)
  if (isPublic) {
    return supabaseResponse
  }

  // Protect admin-only routes: redirect anonymous users to home
  if (isAdminRoute && !user) {
    const redirectTo = encodeURIComponent(url.pathname + (url.search || ""))
    const dest = new URL(request.url)
    dest.pathname = "/auth"
    dest.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(dest)
  }

  if (
    // For any other non-public route, if not authenticated, send to auth with redirect back
    !user
  ) {
    const redirectTo = encodeURIComponent(url.pathname + (url.search || ""))
    const dest = new URL(request.url)
    dest.pathname = "/auth"
    dest.search = `?redirect=${redirectTo}`
    return NextResponse.redirect(dest)
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
