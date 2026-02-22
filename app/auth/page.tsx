"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Phone, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"

type AuthMode = "login" | "register"

export default function AuthPage() {
  const { session, login, register, isLoading, registrationStatus } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auth State
  const [mode, setMode] = useState<AuthMode>("login")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    block: "",
    lot: "",
    phase: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  // Redirect Logic
  const redirectParam = searchParams.get("redirect")
  const fromLogout = searchParams.get("logout") === "1"
  const isSafeRedirect = !!redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
  const isDev = process.env.NODE_ENV !== "production"

  const defaultRedirect = (session.user && ["admin", "staff"].includes(String(session.user.role))) ? "/admin" : "/"
  const redirectTo = isSafeRedirect ? (redirectParam as string) : defaultRedirect
  const fallbackRedirect = isSafeRedirect ? (redirectParam as string) : ((session.user && ["admin", "staff"].includes(String(session.user.role))) ? "/admin" : "/")

  // Initial Mode
  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "register") setMode("register")
  }, [searchParams])

  // Session Check & Redirect
  useEffect(() => {
    const ready = isDev ? session.isAuthenticated : (session.isAuthenticated && session.user)
    if (ready && !fromLogout) {
      if (registrationStatus === 'pending') {
        console.log("[auth-page] pending registration -> redirect /onboarding")
        router.replace('/onboarding')
        return
      }
      console.log("[auth-page] session ready -> redirect", { redirectTo })
      router.replace(redirectTo)
    }
  }, [isDev, fromLogout, session.isAuthenticated, session.user, router, redirectTo, registrationStatus])

  // Logout Cleanup
  const didLogoutCleanup = useRef(false)
  useEffect(() => {
    if (!fromLogout || didLogoutCleanup.current) return
    didLogoutCleanup.current = true
      ; (async () => {
        try {
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: null, refresh_token: null }),
          })
        } catch (e) { console.error(e) }
      })()
  }, [fromLogout])

  const handleAuthSuccess = () => {
    // If registration is pending, the useEffect above should handle it once status updates
    // But we can force a check or just rely on the router refresh from useAuth triggering the effect
    if (registrationStatus === 'pending') {
      router.replace('/onboarding')
      return
    }

    router.replace(redirectTo)

    // Fallback for safety
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth")) {
        if (registrationStatus === 'pending') {
          window.location.replace('/onboarding')
        } else {
          window.location.replace(fallbackRedirect)
        }
      }
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const isValidPhone = (phone: string) => {
      const filtered = phone.replace(/\D/g, "")
      return filtered.length >= 10
    }

    if (mode === "login") {
      if (!formData.email || !formData.password) {
        setError("Please fill in all fields")
        return
      }
      if (!isValidEmail(formData.email)) {
        setError("Please enter a valid email address")
        return
      }
      const res = await login(formData.email, formData.password)
      if (res.success) handleAuthSuccess()
      else setError(res.error || "Login failed")
    } else {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.block || !formData.lot || !formData.phase) {
        setError("All fields and your Block/Lot/Phase are required")
        return
      }
      if (!isValidEmail(formData.email)) {
        setError("Please enter a valid email address")
        return
      }
      if (formData.phone && !isValidPhone(formData.phone)) {
        setError("Please enter a valid phone number (at least 10 digits)")
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters")
        return
      }
      const res = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        block: formData.block,
        lot: formData.lot,
        phase: formData.phase
      })
      if (res.success) handleAuthSuccess()
      else setError(res.error || "Registration failed")
    }
  }

  if ((isDev && session.isAuthenticated) || (session.isAuthenticated && session.user)) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-100">
      <Link href="/" className="absolute top-8 left-8 p-3 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-95 z-20">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Glassmorphic Card */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 md:p-10">

          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative group mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Image
                src="/NEVHA logo.svg"
                alt="NEVHA Logo"
                width={80}
                height={80}
                className="w-20 h-20 rounded-2xl relative z-10 shadow-sm"
              />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">
              {mode === "login" ? "Welcome Back" : "Join NEVHA"}
            </h1>
            <p className="text-[15px] text-slate-500 font-medium mt-2 text-center max-w-[240px]">
              {mode === "login" ? "Sign in to access your secure community portal" : "Create an account to stay connected with your village"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-100 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">First Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input
                          className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Last Name</label>
                      <Input
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Block</label>
                      <Input
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                        placeholder="Blk"
                        value={formData.block}
                        onChange={e => setFormData({ ...formData, block: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Lot</label>
                      <Input
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                        placeholder="Lot"
                        value={formData.lot}
                        onChange={e => setFormData({ ...formData, lot: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Phase</label>
                      <Input
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                        placeholder="Ph"
                        value={formData.phase}
                        onChange={e => setFormData({ ...formData, phase: e.target.value })}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                      placeholder="0917 123 4567"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {mode === "login" && (
              <div className="flex justify-end pt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            <Button
              type="button" // Prevent default to handle logic
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {mode === "login" ? "New resident?" : "Already have an account?"}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setError("")
                }}
                className="ml-1.5 text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                {mode === "login" ? "Register now" : "Log in"}
              </button>
            </p>
          </div>
        </div>

        {mode === "login" && (
          <p className="mt-8 text-center text-[11px] text-slate-400 font-medium opacity-60">
            Note: Admins will be redirected to the secure dashboard.
          </p>
        )}
      </motion.div>
    </div>
  )
}

