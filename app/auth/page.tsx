// Authentication page with login and register forms

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/hooks/use-auth"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const isSafeRedirect = redirect.startsWith("/") && !redirect.startsWith("//")
  const redirectTo = isSafeRedirect ? redirect : "/dashboard"

  useEffect(() => {
    // Redirect if already authenticated
    if (session.isAuthenticated) {
      router.push(redirectTo)
    }
  }, [session.isAuthenticated, router, redirectTo])

  const handleAuthSuccess = () => {
    router.push(redirectTo)
  }

  if (session.isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onSuccess={handleAuthSuccess} onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}
