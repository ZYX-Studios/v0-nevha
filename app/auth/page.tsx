// Authentication page with login and register forms

"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function AuthPage() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect")
  const isSafeRedirect = !!redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
  const isDev = process.env.NODE_ENV !== "production"
  const defaultRedirect = isDev
    ? "/admin"
    : session.user && ["admin", "staff"].includes(String(session.user.role))
      ? "/admin"
      : "/"
  const redirectTo = isSafeRedirect ? (redirectParam as string) : defaultRedirect

  useEffect(() => {
    // In development, redirect immediately on isAuthenticated.
    // In production, redirect only after we have the app user loaded (role-aware).
    const ready = isDev ? session.isAuthenticated : (session.isAuthenticated && session.user)
    if (ready) {
      console.log("[auth-page] session ready -> redirect", { redirectTo, role: session.user?.role })
      router.replace(redirectTo)
    }
  }, [isDev, session.isAuthenticated, session.user, router, redirectTo])

  const handleAuthSuccess = () => {
    if (isDev) {
      // In dev, redirect immediately for fast iteration
      router.replace(redirectTo)
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
