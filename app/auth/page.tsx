// Authentication page with login and register forms

"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function AuthPage() {
  const { session, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")
  const fromLogout = searchParams.get("logout") === "1"
  const isSafeRedirect = !!redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
  const isDev = process.env.NODE_ENV !== "production"
  const defaultRedirect = isDev
    ? "/admin"
    : session.user && ["admin", "staff"].includes(String(session.user.role))
      ? "/admin"
      : "/"
  const redirectTo = isSafeRedirect ? (redirectParam as string) : defaultRedirect
  // Fallback redirect used when session is authenticated but user role is not yet loaded
  // Prefer explicit redirect param if present, otherwise send admins to /admin by default
  const fallbackRedirect = isSafeRedirect ? (redirectParam as string) : "/admin"

  useEffect(() => {
    // In development, redirect immediately on isAuthenticated.
    // In production, redirect only after we have the app user loaded (role-aware).
    const ready = isDev ? session.isAuthenticated : (session.isAuthenticated && session.user)
    if (ready && !fromLogout) {
      console.log("[auth-page] session ready -> redirect", { redirectTo, role: session.user?.role })
      router.replace(redirectTo)
    }
  }, [isDev, fromLogout, session.isAuthenticated, session.user, router, redirectTo])

  // Fallback redirect if, after auth, we still remain on /auth due to any race condition
  useEffect(() => {
    if (!session.isAuthenticated || fromLogout) return
    const t = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth")) {
          console.log("[auth-page] fallback redirect (still on /auth) ->", fallbackRedirect)
          window.location.replace(fallbackRedirect)
        }
      } catch (e) {
        console.log("[auth-page] fallback redirect error", e)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [session.isAuthenticated, fromLogout, fallbackRedirect])

  // If we arrived at /auth with ?logout=1, ensure server cookies are cleared once.
  // Avoid calling supabase.auth.signOut() here to prevent client hangs; admin page already invoked logout.
  const didLogoutCleanup = useRef(false)
  useEffect(() => {
    if (!fromLogout || didLogoutCleanup.current) return
    didLogoutCleanup.current = true
    console.log("[auth-page] logout param present -> clearing server session via /api/auth/sync")
    ;(async () => {
      try {
        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: null, refresh_token: null }),
          credentials: "include",
        })
        console.log("[auth-page] logout cleanup completed", { ok: res.ok, status: res.status })
      } catch (e) {
        console.log("[auth-page] logout cleanup error", e)
      }
    })()
  }, [fromLogout])

  const handleAuthSuccess = () => {
    console.log("[auth-page] handleAuthSuccess called", { isDev, redirectTo })
    if (isDev) {
      try {
        // In dev, redirect immediately for fast iteration
        router.replace(redirectTo)
        console.log("[auth-page] router.replace called")
      } catch (e) {
        console.log("[auth-page] router.replace error", e)
      }
      // Fallback in case router navigation is delayed by middleware/session sync
      setTimeout(() => {
        try {
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth")) {
            console.log("[auth-page] fallback (handleAuthSuccess) window.location.replace ->", fallbackRedirect)
            window.location.replace(fallbackRedirect)
          }
        } catch (e) {
          console.log("[auth-page] fallback (handleAuthSuccess) error", e)
        }
      }, 1000)
    } else {
      console.log("[auth-page] handleAuthSuccess -> waiting for session.user to load before redirect")
    }
  }

  if ((isDev && session.isAuthenticated) || (session.isAuthenticated && session.user)) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <p className="mb-3 text-center text-xs text-gray-400">
          After signing in, you will be redirected to <span className="font-medium text-gray-300">{redirectTo}</span>.
        </p>
        <LoginForm onSuccess={handleAuthSuccess} />
      </div>
    </div>
  )
}

